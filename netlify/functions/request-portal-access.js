/**
 * request-portal-access.js
 * Public endpoint called from the payment-complete page.
 * Upserts the player's email in GHL and adds the "applied" tag
 * so the portal-login automation fires on the correct email.
 *
 * This gives the workflow a second shot — the first comes from
 * process-payment.js using the billing email (which may be a parent's).
 *
 * Rate-limited aggressively to prevent abuse.
 *
 * POST body (JSON):
 *   { "email": "player@example.com", "firstName": "Jane", "lastName": "Doe" }
 *
 * Env vars required:
 *   GHL_API_KEY      — GoHighLevel Private Integration token
 *   GHL_LOCATION_ID  — GHL sub-account location ID
 */

const rateLimit = {};
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (rateLimit[ip].length >= RATE_LIMIT_MAX) return true;
  rateLimit[ip].push(now);
  return false;
}

const GHL_BASE = "https://services.leadconnectorhq.com";

function ghlHeaders() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const clientIp =
    event.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    event.headers["client-ip"] ||
    "unknown";
  if (isRateLimited(clientIp)) {
    return { statusCode: 429, body: JSON.stringify({ error: "Too many requests" }) };
  }

  if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) {
    console.error("[request-portal-access] GHL env vars not configured");
    return { statusCode: 500, body: JSON.stringify({ error: "Server configuration error" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const email = (body.email || "").trim().toLowerCase();
  const firstName = (body.firstName || "").trim().slice(0, 100);
  const lastName = (body.lastName || "").trim().slice(0, 100);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Valid email required" }) };
  }

  try {
    // Upsert contact in GHL
    const upsertRes = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify({
        locationId: process.env.GHL_LOCATION_ID,
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      }),
    });
    if (!upsertRes.ok) {
      const text = await upsertRes.text();
      throw new Error(`GHL upsert ${upsertRes.status}: ${text.substring(0, 200)}`);
    }
    const upsertData = await upsertRes.json();
    const contactId = upsertData.contact?.id || upsertData.id;

    // Add "applied" tag to trigger portal login workflow
    const tagRes = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: ghlHeaders(),
      body: JSON.stringify({ tags: ["applied"] }),
    });
    if (!tagRes.ok) {
      const text = await tagRes.text();
      throw new Error(`GHL addTag ${tagRes.status}: ${text.substring(0, 200)}`);
    }

    console.log(`[request-portal-access] Tagged as applied: email=${email} contactId=${contactId}`);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("[request-portal-access] Error:", err.message);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to process request. Please contact info@floridacoastalprep.com" }),
    };
  }
};
