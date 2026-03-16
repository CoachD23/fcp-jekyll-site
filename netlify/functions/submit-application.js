/**
 * Submit Application — Dual-Write to Airtable + GHL
 *
 * Receives native HTML form POST from /apply/us/ or /apply/international/.
 * 1. Creates a Students record in Airtable (Status: "Applied")
 * 2. Creates/updates a GHL contact (tags: applicant, origin)
 * 3. Returns success with next-step instructions
 *
 * Environment variables required:
 *   AIRTABLE_API_KEY   — Airtable personal access token
 *   AIRTABLE_BASE_ID   — e.g. appxcQo4oZEbtF5my
 *   GHL_API_KEY         — GoHighLevel API key (pit-...)
 *   GHL_LOCATION_ID     — GoHighLevel location (jBDUi7...)
 */

const https = require("https");

// ── Rate limiter ──────────────────────────────────────────────
const rateLimit = {};
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(ip) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (rateLimit[ip].length >= RATE_LIMIT_MAX) return true;
  rateLimit[ip].push(now);
  return false;
}

// ── CORS ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://floridacoastalprep.com",
  "https://www.floridacoastalprep.com",
  "https://candid-starburst-baa4f7.netlify.app"
];

function getCorsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}

// ── Sanitize ──────────────────────────────────────────────────
function sanitize(str, maxLen = 255) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[<>"']/g, "").trim().substring(0, maxLen);
}

function sanitizeEmail(str) {
  if (!str || typeof str !== "string") return "";
  const email = str.trim().toLowerCase().substring(0, 320);
  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
}

function sanitizePhone(str) {
  if (!str || typeof str !== "string") return "";
  // Keep only digits, +, -, (, ), spaces
  return str.replace(/[^0-9+\-() ]/g, "").trim().substring(0, 30);
}

// ── HTTP helper ───────────────────────────────────────────────
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    if (body) req.write(typeof body === "string" ? body : JSON.stringify(body));
    req.end();
  });
}

// ── Airtable: Create Student Record ───────────────────────────
async function createAirtableStudent(fields) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    console.error("Missing Airtable credentials");
    return { success: false, error: "Airtable configuration error" };
  }

  const body = JSON.stringify({
    records: [{ fields }],
    typecast: true // auto-creates select options if needed
  });

  const result = await httpRequest(
    {
      hostname: "api.airtable.com",
      path: `/v0/${baseId}/Students`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      }
    },
    body
  );

  if (result.status === 200 && result.data.records && result.data.records.length > 0) {
    return { success: true, record: result.data.records[0] };
  }

  console.error("Airtable create failed:", JSON.stringify(result.data).substring(0, 500));
  return { success: false, error: result.data?.error?.message || "Airtable create failed" };
}

// ── GHL: Create/Update Contact ────────────────────────────────
async function createGhlContact(contactData) {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;

  if (!apiKey || !locationId) {
    console.warn("GHL credentials not configured — skipping GHL write");
    return { success: false, error: "GHL not configured" };
  }

  const body = JSON.stringify({
    firstName: contactData.firstName,
    lastName: contactData.lastName,
    email: contactData.email,
    phone: contactData.phone,
    locationId: locationId,
    tags: contactData.tags || [],
    source: "FCP Website Application",
    customField: contactData.customFields || []
  });

  const result = await httpRequest(
    {
      hostname: "services.leadconnectorhq.com",
      path: "/contacts/",
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        Version: "2021-07-28"
      }
    },
    body
  );

  // GHL returns 200 for create, 400 if contact exists (use upsert)
  if (result.status === 200 || result.status === 201) {
    return { success: true, contactId: result.data?.contact?.id || result.data?.id };
  }

  // If contact already exists, try upsert
  if (result.status === 400 || result.status === 422) {
    console.log("GHL contact may exist, attempting upsert...");
    const upsertBody = JSON.stringify({
      ...JSON.parse(body),
      locationId: locationId
    });
    const upsertResult = await httpRequest(
      {
        hostname: "services.leadconnectorhq.com",
        path: "/contacts/upsert",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(upsertBody),
          Version: "2021-07-28"
        }
      },
      upsertBody
    );

    if (upsertResult.status === 200 || upsertResult.status === 201) {
      return { success: true, contactId: upsertResult.data?.contact?.id || upsertResult.data?.id };
    }
    console.error("GHL upsert failed:", JSON.stringify(upsertResult.data).substring(0, 500));
    return { success: false, error: "GHL upsert failed" };
  }

  console.error("GHL create failed:", JSON.stringify(result.data).substring(0, 500));
  return { success: false, error: "GHL create failed" };
}

// ── Main Handler ──────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin || "";
  const headers = getCorsHeaders(origin);

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // Rate limit
  const clientIp = event.headers["x-forwarded-for"] || event.headers["client-ip"] || "unknown";
  if (isRateLimited(clientIp)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: "Too many requests. Please wait." }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // ── Validate required fields ──────────────────────────────
    const firstName = sanitize(body.firstName, 100);
    const lastName = sanitize(body.lastName, 100);
    const email = sanitizeEmail(body.email);
    const phone = sanitizePhone(body.phone);
    const program = sanitize(body.program, 50);
    const origin_type = sanitize(body.origin, 20); // "US" or "International"
    const gradYear = sanitize(body.gradYear, 10);
    const position = sanitize(body.position, 50);
    const highSchool = sanitize(body.highSchool, 200);
    const city = sanitize(body.city, 100);
    const state = sanitize(body.state, 50);
    const country = sanitize(body.country, 100);

    const errors = [];
    if (!firstName) errors.push("First name is required");
    if (!lastName) errors.push("Last name is required");
    if (!email) errors.push("Valid email is required");
    if (!phone) errors.push("Phone number is required");
    if (!program || !["Post Grad", "High School"].includes(program)) {
      errors.push("Program must be Post Grad or High School");
    }
    if (!origin_type || !["US", "International"].includes(origin_type)) {
      errors.push("Origin must be US or International");
    }

    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, errors })
      };
    }

    const studentName = firstName + " " + lastName;
    const appliedAt = new Date().toISOString();

    // ── 1. Create Airtable Student record ─────────────────────
    const airtableFields = {
      Student_Name: studentName,
      First_Name: firstName,
      Last_Name: lastName,
      Player_Email: email,
      Phone: phone,
      Program: program,
      Status: "Prospect",
      Origin: origin_type,
      Country: origin_type === "International" ? (country || "International") : (country || state || "US"),
      Applied_At: appliedAt,
      Onboarding_Status: "Applied"
    };

    // Optional fields
    if (gradYear) airtableFields.Graduation_Year = gradYear;
    if (position) airtableFields.Position = position;
    if (highSchool) airtableFields.High_School = highSchool;
    if (city) airtableFields.City = city;

    const airtableResult = await createAirtableStudent(airtableFields);

    // ── 2. Create GHL contact ─────────────────────────────────
    const ghlTags = ["applicant", "paid-applicant", origin_type.toLowerCase()];
    if (program === "Post Grad") ghlTags.push("post-grad");
    if (program === "High School") ghlTags.push("high-school");

    const ghlResult = await createGhlContact({
      firstName,
      lastName,
      email,
      phone,
      tags: ghlTags,
      customFields: []
    });

    // ── 3. Update Airtable with GHL contact ID ────────────────
    if (airtableResult.success && ghlResult.success && ghlResult.contactId) {
      const recordId = airtableResult.record.id;
      const apiKey = process.env.AIRTABLE_API_KEY;
      const baseId = process.env.AIRTABLE_BASE_ID;
      const updateBody = JSON.stringify({
        fields: { GHL_Contact_ID: ghlResult.contactId }
      });
      await httpRequest(
        {
          hostname: "api.airtable.com",
          path: `/v0/${baseId}/Students/${recordId}`,
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(updateBody)
          }
        },
        updateBody
      ).catch(err => console.error("Failed to update GHL_Contact_ID:", err.message));
    }

    // ── 4. Return result ──────────────────────────────────────
    // We consider success even if GHL fails — Airtable is source of truth
    if (airtableResult.success) {
      console.log(`Application submitted: ${studentName} (${program}, ${origin_type})`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "Application submitted successfully",
          studentName,
          program,
          origin: origin_type,
          ghl_synced: ghlResult.success
        })
      };
    }

    // Airtable failed — this is a real error
    console.error("Application failed — Airtable error:", airtableResult.error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "We couldn't process your application right now. Please try again or call 850-961-2323."
      })
    };
  } catch (err) {
    console.error("Submit application error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: "An unexpected error occurred. Please try again or call 850-961-2323."
      })
    };
  }
};
