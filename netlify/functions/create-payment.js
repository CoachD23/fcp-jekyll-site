const https = require("https");

// ── Rate limiter (in-memory, per function instance) ──────────────
const rateLimit = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3; // max 3 payment requests per minute per IP

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

// ── Sanitize input ───────────────────────────────────────────────
function sanitize(str, maxLen = 255) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[<>"'&]/g, "").trim().substring(0, maxLen);
}

// ── Main handler ─────────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin || "";
  const headers = getCorsHeaders(origin);

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  // Rate limiting
  const clientIp =
    event.headers["x-forwarded-for"] ||
    event.headers["client-ip"] ||
    "unknown";
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: "Too many requests. Please wait a moment and try again." })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const participantName = sanitize(body.participantName, 100);
    const purpose = sanitize(body.purpose, 100);
    const amount = parseFloat(body.amount);

    // ── Validate ───────────────────────────────────────────────
    if (!participantName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Participant name is required." })
      };
    }
    if (!purpose) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Purpose of deposit is required." })
      };
    }
    if (isNaN(amount) || amount < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Minimum payment amount is $10.00." })
      };
    }
    if (amount > 50000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "For payments over $50,000, please contact us directly at 850-961-2323." })
      };
    }

    // ── Authorize.net credentials ──────────────────────────────
    const apiLoginId = process.env.AUTHORIZE_API_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_TRANSACTION_KEY;

    if (!apiLoginId || !transactionKey) {
      console.error("Missing Authorize.net credentials in environment");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Payment system configuration error. Please call 850-961-2323." })
      };
    }

    // ── Build hosted payment page request ──────────────────────
    const orderDescription = (purpose + " - " + participantName).substring(0, 255);

    const requestBody = JSON.stringify({
      getHostedPaymentPageRequest: {
        merchantAuthentication: {
          name: apiLoginId,
          transactionKey: transactionKey
        },
        transactionRequest: {
          transactionType: "authCaptureTransaction",
          amount: amount.toFixed(2),
          order: {
            description: orderDescription
          }
        },
        hostedPaymentSettings: {
          setting: [
            {
              settingName: "hostedPaymentReturnOptions",
              settingValue: JSON.stringify({
                showReceipt: true,
                url: "https://floridacoastalprep.com/payment-complete/",
                urlText: "Return to Florida Coastal Prep",
                cancelUrl: "https://floridacoastalprep.com/payment/",
                cancelUrlText: "Cancel and return to payment page"
              })
            },
            {
              settingName: "hostedPaymentButtonOptions",
              settingValue: JSON.stringify({ text: "Submit Payment" })
            },
            {
              settingName: "hostedPaymentPaymentOptions",
              settingValue: JSON.stringify({
                cardCodeRequired: true,
                showBankAccount: false
              })
            },
            {
              settingName: "hostedPaymentBillingAddressOptions",
              settingValue: JSON.stringify({
                show: true,
                required: true
              })
            },
            {
              settingName: "hostedPaymentOrderOptions",
              settingValue: JSON.stringify({
                show: true,
                merchantName: "Florida Coastal Prep Sports Academy"
              })
            },
            {
              settingName: "hostedPaymentCustomerOptions",
              settingValue: JSON.stringify({
                showEmail: true,
                requiredEmail: true
              })
            },
            {
              settingName: "hostedPaymentStyleOptions",
              settingValue: JSON.stringify({ bgColor: "white" })
            },
            {
              settingName: "hostedPaymentSecurityOptions",
              settingValue: JSON.stringify({ captcha: false })
            }
          ]
        }
      }
    });

    // ── Call Authorize.net API ──────────────────────────────────
    const response = await new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: "api.authorize.net",
          path: "/xml/v1/request.api",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(requestBody)
          }
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", reject);
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error("Request timeout"));
      });
      req.write(requestBody);
      req.end();
    });

    // Parse response (Authorize.net may include BOM character)
    const cleanResponse = response.replace(/^\uFEFF/, "");
    const result = JSON.parse(cleanResponse);

    if (
      result.messages &&
      result.messages.resultCode === "Ok" &&
      result.token
    ) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ token: result.token })
      };
    } else {
      const errorMsg =
        result.messages?.message?.[0]?.text || "Payment initialization failed";
      console.error("Authorize.net error:", errorMsg);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Unable to connect to payment processor. Please try again or call 850-961-2323."
        })
      };
    }
  } catch (err) {
    console.error("Payment function error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "An unexpected error occurred. Please try again or call 850-961-2323."
      })
    };
  }
};
