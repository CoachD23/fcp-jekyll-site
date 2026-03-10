/**
 * submit-application.js
 * Handles FCP application form submissions (US and International).
 *
 * Accepts POST from both forms:
 *   - fcp-us-application  (application/x-www-form-urlencoded)
 *   - fcp-international-application (multipart/form-data with file uploads)
 *
 * Returns 200 JSON { success: true } on success so the client-side
 * fetch .then(res => res.ok) branch fires and redirects / shows success state.
 *
 * TODO: add GHL webhook or email notification here once confirmed working.
 */

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  // Accept any POST — both URL-encoded and multipart bodies are valid.
  // We just return 200 so the client proceeds to its success path.
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true }),
  };
};
