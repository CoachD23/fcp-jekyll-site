/**
 * submit-waiver.js
 * Handles gym liability waiver submissions.
 *
 * Creates/upserts a GHL contact, adds a timestamped note, and tags with "Gym Waiver Signed".
 * Signature is validated (must be non-empty) but the raw image is not stored — only a
 * confirmation note is added to the GHL contact record.
 *
 * Env vars required (already set in Netlify dashboard):
 *   GHL_API_KEY       – GoHighLevel Private Integration token
 *   GHL_LOCATION_ID   – GHL sub-account location ID
 */

// ── Rate limiter (in-memory, per function instance) ──────────────────────────
const rateLimit = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (rateLimit[ip].length >= RATE_LIMIT_MAX) return true;
  rateLimit[ip].push(now);
  return false;
}

// ─── GHL helpers ──────────────────────────────────────────────────────────────

async function upsertGhlContact({ firstName, lastName, email, phone, dob }) {
  const payload = {
    locationId: process.env.GHL_LOCATION_ID,
    firstName,
    lastName,
    email,
    tags: ['Gym Waiver Signed'],
  };
  if (phone) payload.phone = phone;
  if (dob)   payload.dateOfBirth = dob;

  const res = await fetch('https://services.leadconnectorhq.com/contacts/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GHL_API_KEY}`,
      Version: '2021-07-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL upsert ${res.status}: ${body}`);
  }
  return res.json();
}

async function addGhlNote(contactId, ip) {
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'long',
    timeStyle: 'short',
  });
  const body =
    `Florida Coastal Prep — Gym Liability Waiver\n` +
    `Signed: ${timestamp} ET\n` +
    `IP: ${ip}\n\n` +
    `Applicant read and agreed to the full FCP gym liability waiver. Digital signature captured.`;

  const res = await fetch(
    `https://services.leadconnectorhq.com/contacts/${contactId}/notes`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    }
  );

  if (!res.ok) {
    console.warn('GHL note add failed:', res.status);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const clientIp =
    event.headers['x-forwarded-for']?.split(',')[0].trim() ||
    event.headers['client-ip'] ||
    'unknown';

  if (isRateLimited(clientIp)) {
    return { statusCode: 429, body: 'Too many requests' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Bad Request' };
  }

  // Honeypot
  if (body.botField) {
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  }

  const { firstName, lastName, email, phone, dob, signature } = body;

  if (!firstName || !lastName || !email || !signature) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  // Validate signature is a real drawn canvas export
  if (!signature.startsWith('data:image/')) {
    return { statusCode: 400, body: 'Invalid signature' };
  }

  // Sanitize
  const safe = {
    firstName: String(firstName).trim().slice(0, 100),
    lastName:  String(lastName).trim().slice(0, 100),
    email:     String(email).trim().slice(0, 200).toLowerCase(),
    phone:     phone ? String(phone).trim().slice(0, 30) : '',
    dob:       dob   ? String(dob).trim().slice(0, 20) : '',
  };

  try {
    const result = await upsertGhlContact(safe);
    const contactId = result.contact?.id || result.id;
    if (contactId) {
      await addGhlNote(contactId, clientIp);
    }
  } catch (err) {
    console.error('GHL error:', err.message);
    return { statusCode: 500, body: 'Error saving waiver' };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  };
};
