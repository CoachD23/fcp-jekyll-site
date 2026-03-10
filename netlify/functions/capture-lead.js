/**
 * capture-lead.js
 * Called when a user completes the contact-info step on either apply form.
 * Upserts the contact in GoHighLevel and tags them "Started Application - Incomplete".
 *
 * Env vars required (set in Netlify dashboard):
 *   GHL_API_KEY      - Private Integration token
 *   GHL_LOCATION_ID  - GHL Location ID
 */

const GHL_BASE = 'https://services.leadconnectorhq.com';

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    'Content-Type': 'application/json',
    Version: '2021-07-28',
  };
}

async function upsertContact({ firstName, lastName, email, phone }) {
  const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID,
      firstName,
      lastName,
      email,
      phone,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL upsert ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.contact?.id;
}

async function addTag(contactId, tag) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: ghlHeaders(),
    body: JSON.stringify({ tags: [tag] }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL addTag ${res.status}: ${text}`);
  }
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;

    const { firstName = '', lastName = '', email, phone = '' } = JSON.parse(raw);

    if (!email) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'email required' }),
      };
    }

    const contactId = await upsertContact({ firstName, lastName, email, phone });
    if (contactId) {
      await addTag(contactId, 'Started Application - Incomplete');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('[capture-lead] Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Lead capture failed' }),
    };
  }
};
