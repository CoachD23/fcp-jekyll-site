/**
 * trigger-portal-login.js
 * Admin-only function: upserts a contact in GHL and adds the "applied" tag
 * so the portal login automation fires.
 *
 * Auth: requires X-Admin-Secret header matching RECAP_ACCESS_CODE env var.
 *
 * POST body (JSON):
 *   { "emails": ["a@b.com", "c@d.com"] }
 *   — or —
 *   { "email": "a@b.com", "firstName": "Jane", "lastName": "Doe" }
 *
 * Env vars required:
 *   RECAP_ACCESS_CODE  — shared admin secret (already set in Netlify)
 *   GHL_API_KEY        — GoHighLevel Private Integration token
 *   GHL_LOCATION_ID    — GHL sub-account location ID
 */

const crypto = require("crypto");

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_HEADERS = () => ({
  Authorization: `Bearer ${process.env.GHL_API_KEY}`,
  "Content-Type": "application/json",
  Version: "2021-07-28"
});

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  const len = Math.max(bufA.length, bufB.length);
  const padA = Buffer.alloc(len);
  const padB = Buffer.alloc(len);
  bufA.copy(padA);
  bufB.copy(padB);
  return crypto.timingSafeEqual(padA, padB);
}

async function upsertContact(email, firstName, lastName) {
  const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: GHL_HEADERS(),
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID,
      email,
      firstName: firstName || "",
      lastName: lastName || ""
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL upsert ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.contact || { id: data.id, firstName: firstName || "", email };
}

async function sendPortalEmail(contactId, email, firstName) {
  const locationId = process.env.GHL_LOCATION_ID;
  const name = firstName || "Athlete";

  const portalEmailBody =
    "Hi " + name + ",\n\n" +
    "Your FCP application is confirmed — your Player Portal is ready.\n\n" +
    "ACCESS YOUR PLAYER PORTAL:\n" +
    "https://ops.floridacoastalprep.com/player/\n\n" +
    "To log in, visit the link above and enter your email address. We'll send you a magic link instantly — no password needed.\n\n" +
    "In the portal you can:\n" +
    "• Submit your player forms and documents\n" +
    "• View your enrollment status\n" +
    "• Communicate with our coaching staff\n\n" +
    "If you have any trouble accessing the portal, reply to this email or call us at (850) 961-2323.\n\n" +
    "Welcome to FCP!\n\n" +
    "Florida Coastal Prep\n" +
    "33 Jet Drive NW, Fort Walton Beach, FL 32548\n" +
    "(850) 961-2323\n" +
    "floridacoastalprep.com";

  // Get or create a conversation for this contact
  let convId = null;
  const convSearchRes = await fetch(
    `${GHL_BASE}/conversations/search?locationId=${locationId}&contactId=${contactId}&limit=1`,
    { headers: GHL_HEADERS() }
  );
  if (convSearchRes.ok) {
    const convData = await convSearchRes.json();
    convId = convData.conversations && convData.conversations[0] && convData.conversations[0].id;
  }

  if (!convId) {
    const createRes = await fetch(`${GHL_BASE}/conversations/`, {
      method: "POST",
      headers: GHL_HEADERS(),
      body: JSON.stringify({ locationId, contactId })
    });
    if (createRes.ok) {
      const createData = await createRes.json();
      convId = createData.conversation && createData.conversation.id;
    }
  }

  if (!convId) {
    console.warn(`[trigger-portal-login] Could not find/create conversation for contactId=${contactId}`);
    return;
  }

  const sendRes = await fetch(`${GHL_BASE}/conversations/messages`, {
    method: "POST",
    headers: GHL_HEADERS(),
    body: JSON.stringify({
      type: "Email",
      contactId,
      conversationId: convId,
      subject: "Your FCP Player Portal Access — Action Required",
      body: portalEmailBody
    })
  });

  if (sendRes.ok) {
    console.log(`[trigger-portal-login] Portal email sent: contactId=${contactId}`);
  } else {
    const err = await sendRes.text();
    console.warn(`[trigger-portal-login] Portal email failed ${sendRes.status}:`, err.substring(0, 200));
  }
}

async function addTag(contactId, tag) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: GHL_HEADERS(),
    body: JSON.stringify({ tags: [tag] })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL addTag ${res.status}: ${text}`);
  }
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ── Auth check ───────────────────────────────────────────────
  const providedSecret =
    event.headers["x-admin-secret"] ||
    event.headers["X-Admin-Secret"] ||
    "";
  const expectedSecret = process.env.RECAP_ACCESS_CODE || "";
  if (!expectedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
    return { statusCode: 403, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: "GHL not configured" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // Accept single email or array of emails
  let targets = [];
  if (Array.isArray(body.emails)) {
    targets = body.emails.map(e => ({ email: e.trim().toLowerCase() }));
  } else if (body.email) {
    targets = [{ email: body.email.trim().toLowerCase(), firstName: body.firstName || "", lastName: body.lastName || "" }];
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: "email or emails required" }) };
  }

  // ── Process each email ───────────────────────────────────────
  const results = [];
  for (const target of targets) {
    try {
      const contact = await upsertContact(target.email, target.firstName, target.lastName);
      const contactId = contact.id;
      await addTag(contactId, "applied");
      console.log(`[trigger-portal-login] Tagged as applied: ${target.email} (contactId=${contactId})`);
      await sendPortalEmail(contactId, target.email, contact.firstName || target.firstName || "");
      results.push({ email: target.email, success: true, contactId });
    } catch (err) {
      console.error(`[trigger-portal-login] Failed for ${target.email}:`, err.message);
      results.push({ email: target.email, success: false, error: err.message });
    }
  }

  const allOk = results.every(r => r.success);
  return {
    statusCode: allOk ? 200 : 207,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ results })
  };
};
