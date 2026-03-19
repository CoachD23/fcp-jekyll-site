const https = require("https");

// ── Rate limiter (in-memory, per function instance) ──────────────
const rateLimit = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3; // max 3 payment attempts per minute per IP

function isRateLimited(ip) {
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = [];
  rateLimit[ip] = rateLimit[ip].filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (rateLimit[ip].length >= RATE_LIMIT_MAX) return true;
  rateLimit[ip].push(now);
  return false;
}

// ── CORS headers ─────────────────────────────────────────────────
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

// ── Sanitize text input ──────────────────────────────────────────
function sanitize(str, maxLen) {
  maxLen = maxLen || 255;
  if (!str || typeof str !== "string") return "";
  return str.replace(/[<>"'&]/g, "").trim().substring(0, maxLen);
}

// ── GHL: tag applicant as "applied" after successful payment ─────
async function tagApplicantInGhl(email) {
  var ghlApiKey = process.env.GHL_API_KEY;
  var ghlLocationId = process.env.GHL_LOCATION_ID;
  if (!ghlApiKey || !ghlLocationId) {
    console.warn("[process-payment] GHL env vars missing — skipping tag");
    return;
  }

  var ghlBase = "https://services.leadconnectorhq.com";
  var ghlHeaders = {
    Authorization: "Bearer " + ghlApiKey,
    "Content-Type": "application/json",
    Version: "2021-07-28"
  };

  // 1. Look up contact by email
  var searchRes = await fetch(
    ghlBase + "/contacts/?locationId=" + ghlLocationId + "&email=" + encodeURIComponent(email),
    { headers: ghlHeaders }
  );
  if (!searchRes.ok) throw new Error("GHL search " + searchRes.status);
  var searchData = await searchRes.json();
  var contact = searchData.contacts && searchData.contacts[0];
  if (!contact) throw new Error("GHL contact not found for " + email);
  var contactId = contact.id;

  // 2. Add "applied" tag
  var addRes = await fetch(ghlBase + "/contacts/" + contactId + "/tags", {
    method: "POST",
    headers: ghlHeaders,
    body: JSON.stringify({ tags: ["applied"] })
  });
  if (!addRes.ok) throw new Error("GHL addTag " + addRes.status);

  // 3. Remove "started application - incomplete" tag
  var delRes = await fetch(ghlBase + "/contacts/" + contactId + "/tags", {
    method: "DELETE",
    headers: ghlHeaders,
    body: JSON.stringify({ tags: ["started application - incomplete"] })
  });
  if (!delRes.ok) {
    console.warn("[process-payment] Could not remove incomplete tag:", delRes.status);
  }

  // 4. Remove contact from the Incomplete Application Follow-Up workflow so they
  //    stop getting "you didn't finish" messages now that they've paid
  var incompleteWfId = "c7b69fc5-0af8-4369-a393-3c4ae38d7bf4";
  var removeWfRes = await fetch(
    ghlBase + "/contacts/" + contactId + "/workflow/" + incompleteWfId,
    { method: "DELETE", headers: ghlHeaders }
  );
  if (!removeWfRes.ok) {
    console.warn("[process-payment] Could not remove from incomplete workflow:", removeWfRes.status);
  } else {
    console.log("[process-payment] Removed from Incomplete Follow-Up workflow: contactId=" + contactId);
  }

  // 5. Send portal access email immediately via GHL conversation
  var firstName = contact.firstName || "Athlete";
  var portalEmailBody = "Hi " + firstName + ",\n\n" +
    "Your $25 registration fee has been received — you're officially in the system!\n\n" +
    "ACCESS YOUR PLAYER PORTAL:\n" +
    "https://ops.floridacoastalprep.com/player/\n\n" +
    "To log in, visit the link above and enter your email address (" + email + "). We'll send you a magic link instantly — no password needed.\n\n" +
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

  // Get or create conversation for this contact
  var convSearchRes = await fetch(
    ghlBase + "/conversations/search?locationId=" + ghlLocationId + "&contactId=" + contactId + "&limit=1",
    { headers: ghlHeaders }
  );
  var convId = null;
  if (convSearchRes.ok) {
    var convData = await convSearchRes.json();
    convId = convData.conversations && convData.conversations[0] && convData.conversations[0].id;
  }

  if (!convId) {
    // Create a new conversation
    var createConvRes = await fetch(ghlBase + "/conversations/", {
      method: "POST",
      headers: ghlHeaders,
      body: JSON.stringify({ locationId: ghlLocationId, contactId: contactId })
    });
    if (createConvRes.ok) {
      var createConvData = await createConvRes.json();
      convId = createConvData.conversation && createConvData.conversation.id;
    }
  }

  if (convId) {
    var sendEmailRes = await fetch(ghlBase + "/conversations/messages", {
      method: "POST",
      headers: ghlHeaders,
      body: JSON.stringify({
        type: "Email",
        contactId: contactId,
        conversationId: convId,
        subject: "Your FCP Player Portal Access — Action Required",
        body: portalEmailBody
      })
    });
    if (sendEmailRes.ok) {
      console.log("[process-payment] Portal access email sent: contactId=" + contactId);
    } else {
      var sendErr = await sendEmailRes.text();
      console.warn("[process-payment] Portal email send failed:", sendEmailRes.status, sendErr.substring(0, 200));
    }
  } else {
    console.warn("[process-payment] Could not find/create conversation for portal email: contactId=" + contactId);
  }

  console.log("[process-payment] GHL processing complete: contactId=" + contactId);
}

// ── Main handler ─────────────────────────────────────────────────
exports.handler = async function (event) {
  var origin = event.headers.origin || event.headers.Origin || "";
  var headers = getCorsHeaders(origin);

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  // Rate limiting
  var clientIp =
    event.headers["x-forwarded-for"] ||
    event.headers["client-ip"] ||
    "unknown";
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: headers,
      body: JSON.stringify({ error: "Too many requests. Please wait a moment and try again." })
    };
  }

  try {
    var body = JSON.parse(event.body || "{}");

    // ── Extract fields ─────────────────────────────────────────
    var dataDescriptor = (body.dataDescriptor || "").trim();
    var dataValue = (body.dataValue || "").trim();
    var participantName = sanitize(body.participantName, 100);
    var purpose = sanitize(body.purpose, 100);
    var email = sanitize(body.email, 255);
    var amount = parseFloat(body.amount);

    var source = sanitize(body.source, 50);

    var billFirstName = sanitize(body.billFirstName, 50);
    var billLastName = sanitize(body.billLastName, 50);
    var billAddress = sanitize(body.billAddress, 255);
    var billCity = sanitize(body.billCity, 100);
    var billState = sanitize(body.billState, 50);
    var billZip = sanitize(body.billZip, 20);
    var billCountry = sanitize(body.billCountry, 2);

    // ── Validate ───────────────────────────────────────────────
    if (!dataDescriptor || !dataValue) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: "Payment token is missing. Please try again." })
      };
    }
    if (dataDescriptor !== "COMMON.ACCEPT.INAPP.PAYMENT") {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: "Invalid payment token type." })
      };
    }
    if (!participantName) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: "Participant name is required." })
      };
    }
    if (!purpose) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: "Purpose of deposit is required." })
      };
    }
    if (!email) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: "Email address is required for receipt." })
      };
    }
    if (isNaN(amount) || amount < 10) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: "Minimum payment amount is $10.00." })
      };
    }
    if (amount > 50000) {
      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: "For payments over $50,000, please contact us at 850-961-2323." })
      };
    }

    // ── Authorize.net credentials ──────────────────────────────
    var apiLoginId = process.env.AUTHORIZE_API_LOGIN_ID;
    var transactionKey = process.env.AUTHORIZE_TRANSACTION_KEY;

    if (!apiLoginId || !transactionKey) {
      console.error("Missing Authorize.net credentials in environment");
      return {
        statusCode: 500,
        headers: headers,
        body: JSON.stringify({ error: "Payment system configuration error. Please call 850-961-2323." })
      };
    }

    // ── Build createTransactionRequest ─────────────────────────
    var orderDescription = (purpose + " - " + participantName).substring(0, 255);

    var txnRequest = {
      createTransactionRequest: {
        merchantAuthentication: {
          name: apiLoginId,
          transactionKey: transactionKey
        },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: amount.toFixed(2),
          payment: {
            opaqueData: {
              dataDescriptor: dataDescriptor,
              dataValue: dataValue
            }
          },
          order: {
            description: orderDescription
          },
          customer: {
            email: email
          },
          billTo: {
            firstName: billFirstName || undefined,
            lastName: billLastName || undefined,
            address: billAddress || undefined,
            city: billCity || undefined,
            state: billState || undefined,
            zip: billZip || undefined,
            country: billCountry || undefined
          },
          transactionSettings: {
            setting: [
              {
                settingName: "emailCustomer",
                settingValue: "true"
              }
            ]
          }
        }
      }
    };

    var requestBody = JSON.stringify(txnRequest);

    // ── Call Authorize.net API ──────────────────────────────────
    var response = await new Promise(function (resolve, reject) {
      var req = https.request(
        {
          hostname: "api.authorize.net",
          path: "/xml/v1/request.api",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(requestBody)
          }
        },
        function (res) {
          var data = "";
          res.on("data", function (chunk) { data += chunk; });
          res.on("end", function () { resolve(data); });
        }
      );
      req.on("error", reject);
      req.setTimeout(15000, function () {
        req.destroy();
        reject(new Error("Request timeout"));
      });
      req.write(requestBody);
      req.end();
    });

    // Parse response (Authorize.net may include BOM character)
    var cleanResponse = response.replace(/^\uFEFF/, "");
    var result = JSON.parse(cleanResponse);

    // ── Check result ───────────────────────────────────────────
    var txnResponse = result.transactionResponse;

    if (
      result.messages &&
      result.messages.resultCode === "Ok" &&
      txnResponse &&
      String(txnResponse.responseCode) === "1"
    ) {
      // Success — responseCode 1 = Approved
      console.log("Payment approved: txnId=" + txnResponse.transId + " amount=$" + amount.toFixed(2));

      // Tag applicant in GHL if this payment came from either application form
      if ((source === "intl-apply" || source === "us-apply") && email) {
        try { await tagApplicantInGhl(email); }
        catch (ghlErr) { console.error("[process-payment] GHL tagging failed:", ghlErr.message); }
      }

      return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({
          success: true,
          transactionId: txnResponse.transId
        })
      };
    } else {
      // Payment failed
      var errorMsg = "Payment was declined. Please check your card details and try again.";

      if (txnResponse && txnResponse.errors && txnResponse.errors.length > 0) {
        errorMsg = txnResponse.errors[0].errorText || errorMsg;
      } else if (result.messages && result.messages.message && result.messages.message.length > 0) {
        errorMsg = result.messages.message[0].text || errorMsg;
      }

      var responseCode = txnResponse ? txnResponse.responseCode : "N/A";
      console.error("Payment declined: responseCode=" + responseCode + " error=" + errorMsg);

      return {
        statusCode: 400,
        headers: headers,
        body: JSON.stringify({ error: errorMsg })
      };
    }
  } catch (err) {
    console.error("Payment processing error:", err.message);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({
        error: "An unexpected error occurred. Please try again or call 850-961-2323."
      })
    };
  }
};
