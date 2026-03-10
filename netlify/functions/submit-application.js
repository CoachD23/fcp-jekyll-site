/**
 * submit-application.js
 * Handles FCP application form submissions (US and International).
 *
 * US form:            application/x-www-form-urlencoded → AIRTABLE_US_TABLE_ID
 * International form: multipart/form-data              → AIRTABLE_INTL_TABLE_ID
 *
 * File upload fields are stored as the filename string only.
 * Signature data-URL values are replaced with "[Signature captured]".
 *
 * Env vars required (set in Netlify dashboard):
 *   AIRTABLE_API_KEY      - Personal Access Token
 *   AIRTABLE_BASE_ID      - e.g. appxcQo4oZEbtF5my
 *   AIRTABLE_US_TABLE_ID  - e.g. tblVSA1iY0elfv3RA
 *   AIRTABLE_INTL_TABLE_ID - e.g. tblDa8mYGDyazHhJo
 */

// ─── Airtable ────────────────────────────────────────────────────────────────

async function postToAirtable(tableId, fields) {
  const res = await fetch(
    `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${tableId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ records: [{ fields }] }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Body parsers ─────────────────────────────────────────────────────────────

function parseUrlEncoded(body) {
  return Object.fromEntries(new URLSearchParams(body));
}

/**
 * Minimal multipart/form-data parser.
 * Text fields → their string value.
 * File fields → the uploaded filename (binary data is discarded).
 */
function parseMultipart(rawBody, boundary, isBase64) {
  // Decode to binary string so byte positions are preserved
  const body = isBase64
    ? Buffer.from(rawBody, 'base64').toString('binary')
    : rawBody;

  const fields = {};

  for (const part of body.split(`--${boundary}`)) {
    if (!part || part.startsWith('--')) continue;

    const sepIdx = part.indexOf('\r\n\r\n');
    if (sepIdx === -1) continue;

    const headers = part.slice(0, sepIdx);
    let value = part.slice(sepIdx + 4);
    // Strip trailing CRLF added before the next boundary
    if (value.endsWith('\r\n')) value = value.slice(0, -2);

    const nameMatch = headers.match(/name="([^"]+)"/i);
    const fileMatch  = headers.match(/filename="([^"]*)"/i);
    if (!nameMatch) continue;

    const fieldName = nameMatch[1];
    fields[fieldName] = fileMatch !== null
      ? (fileMatch[1].trim() || '(no file uploaded)')
      : value;
  }

  return fields;
}

// ─── Field sanitizer ─────────────────────────────────────────────────────────

// Fields added by Netlify / honeypot — not sent to Airtable
const META_FIELDS = new Set(['form-name', 'bot-field', 'g-recaptcha-response', '__netlify_form_name']);

function sanitize(raw) {
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (META_FIELDS.has(k)) continue;
    let val = String(v ?? '').trim();
    // Replace base64 signature data-URLs with a short placeholder
    if (val.startsWith('data:')) val = '[Signature captured]';
    // Guard against unexpectedly huge values
    if (val.length > 5000) val = val.slice(0, 5000) + '…';
    out[k] = val;
  }
  return out;
}

// ─── GHL tag swap ─────────────────────────────────────────────────────────────

/**
 * After a completed submission, replace the "Started Application - Incomplete"
 * tag with "Application Submitted" in GoHighLevel.  Runs fire-and-forget.
 */
async function ghlTagSwap(email) {
  if (!email || !process.env.GHL_API_KEY) return;
  const headers = {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    'Content-Type': 'application/json',
    Version: '2021-07-28',
  };
  const upsertRes = await fetch('https://services.leadconnectorhq.com/contacts/upsert', {
    method: 'POST',
    headers,
    body: JSON.stringify({ locationId: process.env.GHL_LOCATION_ID, email }),
  });
  if (!upsertRes.ok) return;
  const { contact } = await upsertRes.json();
  if (!contact?.id) return;
  // Remove partial tag (ignore errors — contact may not have it)
  await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}/tags`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ tags: ['Started Application - Incomplete'] }),
  }).catch(() => {});
  // Add completed tag
  await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}/tags`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ tags: ['Application Submitted'] }),
  }).catch(() => {});
}

// ─── Handler ─────────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const ct = (event.headers['content-type'] || '').toLowerCase();

  try {
    let raw;
    let tableId;

    if (ct.includes('multipart/form-data')) {
      // ── International application ─────────────────────────────────────────
      const bMatch = ct.match(/boundary=([^\s;]+)/i);
      if (!bMatch) throw new Error('Missing multipart boundary in Content-Type');
      const boundary = bMatch[1].replace(/^"|"$/g, ''); // strip optional quotes
      raw     = parseMultipart(event.body, boundary, !!event.isBase64Encoded);
      tableId = process.env.AIRTABLE_INTL_TABLE_ID;
    } else {
      // ── US application (application/x-www-form-urlencoded) ────────────────
      const body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      raw     = parseUrlEncoded(body);
      tableId = process.env.AIRTABLE_US_TABLE_ID;
    }

    const fields = sanitize(raw);
    await postToAirtable(tableId, fields);

    // Fire-and-forget: swap GHL tag from "Incomplete" → "Submitted"
    ghlTagSwap(fields.email).catch((err) =>
      console.error('[submit-application] GHL tag swap failed:', err.message)
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true }),
    };

  } catch (err) {
    console.error('[submit-application] Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Submission failed. Please try again.' }),
    };
  }
};
