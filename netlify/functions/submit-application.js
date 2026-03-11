/**
 * submit-application.js
 * Handles FCP application form submissions (US and International).
 *
 * US form:            application/x-www-form-urlencoded → AIRTABLE_US_TABLE_ID
 * International form: multipart/form-data               → AIRTABLE_INTL_TABLE_ID
 *
 * File upload fields are stored as the filename string only.
 * Signature data-URL values are replaced with "[Signature captured]".
 *
 * Env vars required (set in Netlify dashboard):
 *   AIRTABLE_API_KEY      – Personal Access Token
 *   AIRTABLE_BASE_ID      – e.g. appxcQo4oZEbtF5my
 *   AIRTABLE_US_TABLE_ID  – e.g. tblVSA1iY0elfv3RA
 *   AIRTABLE_INTL_TABLE_ID – e.g. tblDa8mYGDyazHhJo
 *   GHL_API_KEY           – GoHighLevel Private Integration token
 *   GHL_LOCATION_ID       – GHL sub-account location ID
 */

// ─── Airtable ──────────────────────────────────────────────────────────────────

async function postToAirtable(tableId, fields) {
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${tableId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── GHL tag swap (fire-and-forget) ───────────────────────────────────────────

async function swapGhlTag(email) {
  if (!process.env.GHL_API_KEY || !process.env.GHL_LOCATION_ID) return;
  try {
    const searchRes = await fetch(
      `https://services.leadconnectorhq.com/contacts/search?locationId=${process.env.GHL_LOCATION_ID}&query=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${process.env.GHL_API_KEY}`, Version: '2021-07-28' } }
    );
    if (!searchRes.ok) return;
    const { contacts } = await searchRes.json();
    if (!contacts || contacts.length === 0) return;
    const contactId = contacts[0].id;
    const existingTags = contacts[0].tags || [];
    const newTags = existingTags
      .filter(t => t !== 'Started Application - Incomplete')
      .concat('Application Submitted');
    await fetch(`https://services.leadconnectorhq.com/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tags: newTags }),
    });
  } catch (_) {
    // tag swap is non-critical — swallow errors
  }
}

// ─── Field mappers ─────────────────────────────────────────────────────────────

function mapUsFields(raw) {
  const MAP = {
    'program':                'Program',
    'email':                  'Email',
    'phone':                  'Phone',
    'dob':                    'Date of Birth',
    'position':               'Position',
    'height':                 'Height',
    'weight':                 'Weight',
    'highlight-tape':         'Highlight Tape URL',
    'hs-name':                'HS Name',
    'hs-address1':            'HS Address 1',
    'hs-address2':            'HS Address 2',
    'hs-city':                'HS City',
    'hs-state':               'HS State',
    'hs-zip':                 'HS Zip',
    'hs-graduation-date':     'HS Graduation Date',
    'gpa':                    'GPA',
    'act-sat':                'ACT/SAT Score',
    'hs-coach-name':          'HS Coach Name',
    'hs-coach-phone':         'HS Coach Phone',
    'hs-coach-email':         'HS Coach Email',
    'parent-first-name':      'Parent First Name',
    'parent-last-name':       'Parent Last Name',
    'parent-phone':           'Parent Phone',
    'parent-email':           'Parent Email',
    'parent-address1':        'Parent Address 1',
    'parent-address2':        'Parent Address 2',
    'parent-city':            'Parent City',
    'parent-state':           'Parent State',
    'parent-zip':             'Parent Zip',
    'occupation':             'Occupation',
    'employer':               'Employer',
    'annual-income':          'Annual Income',
    'tuition-responsibility': 'Tuition Responsibility',
    'housing-preference':     'Housing Preference',
    'how-heard':              'How Heard',
    'signature':              'Signature',
  };

  const out = {};
  // Combine first + last name into the primary "Applicant Name" field
  const first = (raw['first-name'] || '').trim();
  const last  = (raw['last-name']  || '').trim();
  if (first || last) out['Applicant Name'] = [first, last].filter(Boolean).join(' ');

  for (const [formKey, airtableCol] of Object.entries(MAP)) {
    if (raw[formKey] !== undefined && raw[formKey] !== '') {
      out[airtableCol] = raw[formKey];
    }
  }
  out['Submitted At'] = new Date().toISOString();
  return out;
}

function mapIntlFields(raw) {
  const MAP = {
    'program':                 'Program',
    'visa-type':               'Visa Type',
    'first-name':              'First Name',
    'last-name':               'Last Name',
    'dob':                     'Date of Birth',
    'city-of-birth':           'City of Birth',
    'country-of-birth':        'Country of Birth',
    'country-of-citizenship':  'Country of Citizenship',
    'position':                'Position',
    'height-weight':           'Height/Weight',
    'highlight-tape':          'Highlight Tape URL',
    'foreign-address1':        'Foreign Address 1',
    'foreign-address2':        'Foreign Address 2',
    'foreign-city':            'Foreign City',
    'foreign-province':        'Foreign Province',
    'foreign-country':         'Foreign Country',
    'email':                   'Email',
    'phone':                   'Phone',
    'passport-surname':        'Passport Surname',
    'passport-given-name':     'Passport Given Name',
    'passport-full-name':      'Passport Full Name',
    'preferred-name':          'Preferred Name',
    'passport-copy':           'Passport Copy Filename',
    'hs-name':                 'HS Name',
    'hs-city':                 'HS City',
    'hs-country':              'HS Country',
    'hs-graduation-date':      'HS Graduation Date',
    'gpa':                     'GPA',
    'act-sat':                 'ACT/SAT Score',
    'hs-coach-name':           'HS Coach Name',
    'hs-coach-phone':          'HS Coach Phone',
    'hs-coach-email':          'HS Coach Email',
    'transcript':              'Transcript Filename',
    'parent-first-name':       'Parent First Name',
    'parent-last-name':        'Parent Last Name',
    'parent-phone':            'Parent Phone',
    'parent-email':            'Parent Email',
    'parent-address1':         'Parent Address 1',
    'parent-address2':         'Parent Address 2',
    'parent-city':             'Parent City',
    'parent-state':            'Parent State',
    'parent-zip':              'Parent Zip',
    'occupation':              'Occupation',
    'employer':                'Employer',
    'annual-income':           'Annual Income',
    'immunization-record':     'Immunization Record Filename',
    'sports-physical':         'Sports Physical Filename',
    'birth-certificate':       'Birth Certificate Filename',
    'tuition-responsibility':  'Tuition Responsibility',
    'housing-preference':      'Housing Preference',
    'how-heard':               'How Heard',
    'signature':               'Signature',
  };

  const out = {};
  // Set "Applicant Name" (primary field) = First + Last
  const first = (raw['first-name'] || '').trim();
  const last  = (raw['last-name']  || '').trim();
  if (first || last) out['Applicant Name'] = [first, last].filter(Boolean).join(' ');

  // Combine HS Address 1 + 2 → single "HS Address" Airtable field
  const hsAddr1 = (raw['hs-address1'] || '').trim();
  const hsAddr2 = (raw['hs-address2'] || '').trim();
  if (hsAddr1 || hsAddr2) out['HS Address'] = [hsAddr1, hsAddr2].filter(Boolean).join(', ');

  for (const [formKey, airtableCol] of Object.entries(MAP)) {
    if (raw[formKey] !== undefined && raw[formKey] !== '') {
      out[airtableCol] = raw[formKey];
    }
  }
  out['Submitted At'] = new Date().toISOString();
  return out;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(raw) {
  const SKIP = new Set(['form-name', 'bot-field', 'first-name', 'last-name',
                        'hs-address1', 'hs-address2']);
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (SKIP.has(k)) {
      out[k] = v; // keep originals so mappers can read them
      continue;
    }
    if (typeof v === 'string') {
      if (v.startsWith('data:')) {
        out[k] = '[Signature captured]';
      } else {
        out[k] = v.trim().slice(0, 5000);
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

function parseUrlEncoded(body) {
  return Object.fromEntries(new URLSearchParams(body));
}

// ─── Multipart parser ─────────────────────────────────────────────────────────

function parseMultipart(body, boundary) {
  const fields = {};
  const boundaryBuf = Buffer.from('--' + boundary);
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'binary');

  const parts = [];
  let start = 0;
  while (start < buf.length) {
    const idx = buf.indexOf(boundaryBuf, start);
    if (idx === -1) break;
    const end = idx;
    if (start > 0) parts.push(buf.slice(start, end - 2)); // strip trailing \r\n
    start = idx + boundaryBuf.length + 2; // skip \r\n after boundary
    if (buf.slice(idx + boundaryBuf.length, idx + boundaryBuf.length + 2).toString() === '--') break;
  }

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = part.slice(0, headerEnd).toString();
    const content = part.slice(headerEnd + 4);

    const nameMatch = headers.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const filenameMatch = headers.match(/filename="([^"]*)"/);
    if (filenameMatch) {
      // File field — store filename only
      fields[name] = filenameMatch[1] || '';
    } else {
      fields[name] = content.toString('utf8').replace(/\r\n$/, '');
    }
  }
  return fields;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const contentTypeRaw = event.headers['content-type'] || '';
  const contentType = contentTypeRaw.toLowerCase();

  // Honeypot check
  let raw;
  try {
    if (contentType.includes('multipart/form-data')) {
      const boundaryMatch = contentTypeRaw.match(/boundary=([^\s;]+)/i);
      if (!boundaryMatch) throw new Error('Missing multipart boundary');
      const bodyBuf = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body, 'binary');
      raw = parseMultipart(bodyBuf, boundaryMatch[1]);
    } else {
      raw = parseUrlEncoded(event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString()
        : event.body);
    }
  } catch (err) {
    console.error('Parse error:', err.message);
    return { statusCode: 400, body: 'Bad Request' };
  }

  if (raw['bot-field']) {
    return { statusCode: 200, body: 'OK' };
  }

  const formName = raw['form-name'] || '';
  const isInternational = formName === 'international-application';

  const sanitized = sanitize(raw);
  const fields = isInternational
    ? mapIntlFields(sanitized)
    : mapUsFields(sanitized);

  const tableId = isInternational
    ? process.env.AIRTABLE_INTL_TABLE_ID
    : process.env.AIRTABLE_US_TABLE_ID;

  try {
    await postToAirtable(tableId, fields);
  } catch (err) {
    console.error('Airtable error:', err.message);
    return { statusCode: 500, body: 'Error saving application' };
  }

  // Fire-and-forget GHL tag swap
  const email = fields['Email'] || '';
  if (email) swapGhlTag(email);

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true }),
  };
};
