/**
 * payment-webhook.js
 * Handles Authorize.net Silent Post — fires on every approved transaction.
 *
 * Setup required (one-time, in Authorize.net dashboard):
 *   Account > Settings > Transaction Format Settings > Silent Post URL
 *   Set to: https://floridacoastalprep.com/.netlify/functions/payment-webhook
 *
 * Authorize.net POSTs form-encoded data including:
 *   x_response_code  — 1=Approved, 2=Declined, 3=Error, 4=Held
 *   x_trans_id       — transaction ID
 *   x_email          — customer email (if provided)
 *   x_amount         — amount charged
 *   x_first_name, x_last_name
 *   x_MD5_Hash       — HMAC-MD5 verification (if configured)
 *
 * This function:
 *   1. Verifies x_response_code === "1" (Approved)
 *   2. Upserts contact in GHL by email
 *   3. Adds "applied" tag → triggers portal login workflow
 *
 * Env vars required:
 *   GHL_API_KEY       — GoHighLevel Private Integration token
 *   GHL_LOCATION_ID   — GHL sub-account location ID
 *   AUTHNET_MD5_HASH  — (optional) MD5 hash key from Authorize.net for verification
 */

const crypto = require("crypto");

const GHL_BASE = "https://services.leadconnectorhq.com";

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-07-28"
  };
}

// Parse Authorize.net's application/x-www-form-urlencoded body
function parseFormBody(body) {
  try {
    return Object.fromEntries(new URLSearchParams(body));
  } catch {
    return {};
  }
}

// Optional: verify Authorize.net MD5 hash signature
function verifyMd5Hash(fields, hashKey) {
  if (!hashKey) return true; // skip if not configured
  const { x_MD5_Hash, x_trans_id, x_amount, x_login } = fields;
  if (!x_MD5_Hash) return true; // skip if not present
  const expected = crypto
    .createHash("md5")
    .update(hashKey + (x_login || "") + (x_trans_id || "") + (x_amount || ""))
    .digest("hex")
    .toUpperCase();
  return x_MD5_Hash.toUpperCase() === expected;
}

async function upsertGhlContact(email, firstName, lastName) {
  const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: ghlHeaders(),
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID,
      email,
      firstName: firstName || "",
      lastName: lastName || ""
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL upsert ${res.status}: ${text.substring(0, 200)}`);
  }
  const data = await res.json();
  return data.contact?.id || data.id;
}

async function addTag(contactId, tag) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: ghlHeaders(),
    body: JSON.stringify({ tags: [tag] })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL addTag ${res.status}: ${text.substring(0, 200)}`);
  }
}

exports.handler = async function (event) {
  // Authorize.net sends POST only
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const fields = parseFormBody(
    event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString()
      : event.body
  );

  const responseCode = fields.x_response_code;
  const transId = fields.x_trans_id || "unknown";
  const email = (fields.x_email || "").trim().toLowerCase();
  const firstName = (fields.x_first_name || "").trim();
  const lastName = (fields.x_last_name || "").trim();
  const amount = fields.x_amount || "0";

  // Only process approved transactions
  if (responseCode !== "1") {
    console.log(`[payment-webhook] Skipping non-approved transaction: transId=${transId} code=${responseCode}`);
    return { statusCode: 200, body: "OK" };
  }

  // Optional MD5 hash verification
  if (!verifyMd5Hash(fields, process.env.AUTHNET_MD5_HASH)) {
    console.error(`[payment-webhook] MD5 hash mismatch — possible spoofed request: transId=${transId}`);
    return { statusCode: 200, body: "OK" }; // Return 200 to Authorize.net regardless
  }

  if (!email) {
    console.warn(`[payment-webhook] Approved transaction but no email: transId=${transId} amount=$${amount}`);
    return { statusCode: 200, body: "OK" };
  }

  if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) {
    console.error("[payment-webhook] GHL env vars not configured");
    return { statusCode: 200, body: "OK" }; // Still 200 — don't cause Authorize.net retry loops
  }

  try {
    const contactId = await upsertGhlContact(email, firstName, lastName);
    await addTag(contactId, "applied");
    console.log(`[payment-webhook] Portal login triggered: email=${email} transId=${transId} amount=$${amount} contactId=${contactId}`);
  } catch (err) {
    console.error(`[payment-webhook] GHL error for ${email}:`, err.message);
    // Still return 200 — don't cause Authorize.net to retry
  }

  return { statusCode: 200, body: "OK" };
};
