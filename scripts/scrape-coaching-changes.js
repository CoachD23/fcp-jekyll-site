#!/usr/bin/env node
/**
 * FCP Coaching Changes Scraper
 * ─────────────────────────────────────────────────────────────────────────────
 * Scrapes HoopDirt + ESPN coaching carousel, merges with existing YAML data,
 * updates _data/coaching_changes.yml, and commits the result.
 *
 * Runtime: Node 20+ (or Bun)
 * Schedule: Weekly via GitHub Actions (every Monday 6:00 AM ET)
 *
 * Dependencies:
 *   npm install yaml js-yaml node-fetch@3 simple-git
 *   (Lightpanda via OpenClaw for JS-rendered pages — install separately)
 *
 * OpenClaw docs:  https://github.com/lightpanda-io/openclaw
 * Lightpanda:     https://github.com/lightpanda-io/browser
 *
 * Usage:
 *   node scripts/scrape-coaching-changes.js           # dry run (stdout only)
 *   node scripts/scrape-coaching-changes.js --write   # write + git commit
 *   bun scripts/scrape-coaching-changes.js --write    # same via Bun
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_FILE = resolve(ROOT, '_data/coaching_changes.yml');
const WRITE_MODE = process.argv.includes('--write');
const TODAY = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

// ── Colour codes for console ────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  cyan:  '\x1b[36m',
  bold:  '\x1b[1m',
};
const log  = (msg) => console.log(`${C.cyan}[FCP]${C.reset} ${msg}`);
const ok   = (msg) => console.log(`${C.green}[OK]${C.reset}  ${msg}`);
const warn = (msg) => console.log(`${C.yellow}[WARN]${C.reset} ${msg}`);
const err  = (msg) => console.error(`${C.red}[ERR]${C.reset}  ${msg}`);

// ── Utility: fetch with timeout & retry ─────────────────────────────────────
async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (e) {
      warn(`Fetch attempt ${i + 1}/${retries} failed for ${url}: ${e.message}`);
      if (i < retries - 1) await sleep(delayMs * (i + 1));
    }
  }
  throw new Error(`All ${retries} fetch attempts failed for ${url}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Load existing YAML ───────────────────────────────────────────────────────
function loadExistingData() {
  if (!existsSync(DATA_FILE)) {
    warn('coaching_changes.yml not found — starting fresh.');
    return { changes: [], meta: {} };
  }
  const raw = readFileSync(DATA_FILE, 'utf8');
  return yaml.load(raw) || { changes: [], meta: {} };
}

// ── Source 1: ESPN Coaching Carousel (static HTML) ───────────────────────────
async function scrapeESPN() {
  log('Fetching ESPN Coaching Carousel...');
  const ESPN_URL = 'https://www.espn.com/mens-college-basketball/story/_/id/48167700/coaching-carousel-tracker-firings-openings-candidates-hirings-buzz-2026';

  try {
    const res = await fetchWithRetry(ESPN_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FCPBot/1.0; +https://floridacoastalprep.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const html = await res.text();
    const changes = parseESPNHTML(html, ESPN_URL);
    ok(`ESPN: found ${changes.length} changes`);
    return changes;
  } catch (e) {
    err(`ESPN scrape failed: ${e.message}`);
    return [];
  }
}

/**
 * Parse ESPN article HTML for coaching change entries.
 * ESPN structures coaching changes as bold school names followed by status text.
 * This is a best-effort heuristic parser — adjust selectors when ESPN updates layout.
 */
function parseESPNHTML(html, sourceUrl) {
  const changes = [];

  // Extract fired/hired/opening patterns from ESPN's text content
  const patterns = [
    // "School Name: FIRED coach X" or "School Name (FIRED)"
    { type: 'fired',   re: /([A-Z][^:\n]+?)(?:\s*:\s*|\s*\()\s*fired\b[^]*?(?:coach\s+)?([A-Za-z\s'.-]+?)(?:\.|,|\n|;|\))/gi },
    { type: 'hired',   re: /([A-Z][^:\n]+?)(?:\s*:\s*|\s*\()\s*hired?\b[^]*?([A-Za-z\s'.-]+?)(?:\s+as\s+head\s+coach|\.|\n|;|\))/gi },
    { type: 'opening', re: /([A-Z][^:\n]+?)\s+(?:job|position|opening)\s+(?:is\s+)?open/gi },
  ];

  // Strip HTML tags for text parsing
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Look for ESPN's structured coaching carousel entries
  // Pattern: "School: Status (Coach Name) — Date"
  const entryRe = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b[^.]*?\b(fired|hired|resigns?|coaching search|opening)\b[^.]*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})?/gi;
  let match;
  const seen = new Set();

  while ((match = entryRe.exec(text)) !== null) {
    const school = (match[1] || '').trim();
    const changeType = normalizeChangeType(match[2] || '');
    const coachName = (match[3] || '').trim();

    if (!school || school.length < 4 || seen.has(school.toLowerCase())) continue;
    if (/^(the|and|but|for|with|this|that|from|they|their|which)$/i.test(school)) continue;

    seen.add(school.toLowerCase());
    changes.push({
      school_raw: school,
      change_type: changeType,
      outgoing_coach: changeType === 'fired' ? coachName : null,
      incoming_coach: changeType === 'hired' ? coachName : null,
      date: TODAY,
      story_url: sourceUrl,
      source: 'espn',
    });
  }

  return changes;
}

function normalizeChangeType(raw) {
  const r = raw.toLowerCase();
  if (r.includes('fired') || r.includes('resign')) return 'fired';
  if (r.includes('hired') || r.includes('hire')) return 'hired';
  if (r.includes('open') || r.includes('search')) return 'opening';
  return 'rumor';
}

// ── Source 2: HoopDirt (JS-rendered — uses OpenClaw + Lightpanda) ─────────────
/**
 * OpenClaw is a headless browser CLI built on Lightpanda (Zig-based, fast).
 * It renders JS-heavy pages and returns clean text/HTML.
 *
 * Install: https://github.com/lightpanda-io/openclaw#installation
 *   curl -LO https://github.com/lightpanda-io/openclaw/releases/latest/download/openclaw-linux-x86_64
 *   chmod +x openclaw-linux-x86_64 && mv openclaw-linux-x86_64 /usr/local/bin/openclaw
 *
 * Usage: openclaw fetch <url> --format text --wait 2000
 */
async function scrapeHoopDirt() {
  log('Fetching HoopDirt via OpenClaw + Lightpanda...');
  const HOOPDIRT_URL = 'https://hoopdirt.com/coaching-changes/';

  // Check if openclaw is available
  let hasOpenClaw = false;
  try {
    execSync('openclaw --version', { stdio: 'pipe' });
    hasOpenClaw = true;
  } catch {
    warn('OpenClaw not found — falling back to plain fetch for HoopDirt');
  }

  try {
    let html;
    if (hasOpenClaw) {
      // Render JS, wait 2s for dynamic content, return full HTML
      const result = execSync(
        `openclaw fetch "${HOOPDIRT_URL}" --format html --wait 2000 --timeout 30000`,
        { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024, timeout: 45000 }
      );
      html = result;
      ok('HoopDirt: Lightpanda render complete');
    } else {
      // Plain fetch fallback (may miss dynamic content)
      const res = await fetchWithRetry(HOOPDIRT_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FCPBot/1.0; +https://floridacoastalprep.com)',
        }
      });
      html = await res.text();
      warn('HoopDirt: using plain fetch (JS rendering unavailable)');
    }

    const changes = parseHoopDirtHTML(html, HOOPDIRT_URL);
    ok(`HoopDirt: found ${changes.length} changes`);
    return changes;
  } catch (e) {
    err(`HoopDirt scrape failed: ${e.message}`);
    return [];
  }
}

/**
 * Parse HoopDirt coaching changes page.
 * HoopDirt typically lists changes in a table or repeated div structure:
 *   School | Coach | Type | Date
 * Adjust selectors based on their actual DOM structure.
 */
function parseHoopDirtHTML(html, sourceUrl) {
  const changes = [];

  // Strip HTML
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\t')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\t{2,}/g, '\t')
    .trim();

  // HoopDirt uses patterns like:
  // "Head Coach | School | Fired/Hired/Resigned | Date"
  // or line-by-line school-name: status entries
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for lines with school names followed by status keywords
    const statusMatch = line.match(
      /^(.{4,50}?)\s*[\t|,]\s*(fired|hired|resign|opening|search)\b/i
    );
    if (!statusMatch) continue;

    const school = statusMatch[1].trim();
    const changeType = normalizeChangeType(statusMatch[2]);
    if (seen.has(school.toLowerCase())) continue;
    seen.add(school.toLowerCase());

    // Try to grab coach name from adjacent line or same line
    const coachMatch = line.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b.*?(fired|hired|resign)/i);
    const coach = coachMatch ? coachMatch[1] : null;

    changes.push({
      school_raw: school,
      change_type: changeType,
      outgoing_coach: (changeType === 'fired' || changeType === 'opening') ? coach : null,
      incoming_coach: changeType === 'hired' ? coach : null,
      date: TODAY,
      story_url: sourceUrl,
      source: 'hoopdirt',
    });
  }

  return changes;
}

// ── Cross-reference with schools.yml ─────────────────────────────────────────
function loadSchools() {
  const schoolsFile = resolve(ROOT, '_data/recruiting/schools.yml');
  if (!existsSync(schoolsFile)) {
    warn('schools.yml not found — skipping school metadata enrichment');
    return [];
  }
  return yaml.load(readFileSync(schoolsFile, 'utf8')) || [];
}

function normalizeSchoolName(name) {
  return name.toLowerCase()
    .replace(/\b(university|college|state|the)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchSchool(rawName, schools) {
  const norm = normalizeSchoolName(rawName);
  // Exact slug match
  const bySlug = schools.find(s => s.slug && s.slug.replace(/-/g, ' ').includes(norm));
  if (bySlug) return bySlug;
  // Partial name match
  const byName = schools.find(s => {
    const sn = normalizeSchoolName(s.name || '');
    return sn.includes(norm) || norm.includes(sn.split(' ')[0]);
  });
  return byName || null;
}

// School lat/lng lookup (for new programs not already in the file)
const KNOWN_COORDS = {
  'syracuse':        { lat: 43.0481,  lng: -76.1474 },
  'indiana':         { lat: 39.1653,  lng: -86.5264 },
  'arizona state':   { lat: 33.4255,  lng: -111.9400 },
  'auburn':          { lat: 32.6099,  lng: -85.4808 },
  'memphis':         { lat: 35.1495,  lng: -90.0490 },
  'gonzaga':         { lat: 47.6670,  lng: -117.4020 },
  'florida state':   { lat: 30.4381,  lng: -84.2806 },
  'oklahoma state':  { lat: 36.1269,  lng: -97.0691 },
  'usc':             { lat: 34.0224,  lng: -118.2851 },
  'ole miss':        { lat: 34.3654,  lng: -89.5373 },
  'georgetown':      { lat: 38.9076,  lng: -77.0723 },
  "st. john's":      { lat: 40.7282,  lng: -73.7949 },
  'kentucky':        { lat: 38.0406,  lng: -84.5037 },
  'kansas':          { lat: 38.9543,  lng: -95.2558 },
  'duke':            { lat: 35.9940,  lng: -78.8986 },
  'north carolina':  { lat: 35.9049,  lng: -79.0469 },
  'michigan':        { lat: 42.2780,  lng: -83.7382 },
  'michigan state':  { lat: 42.7251,  lng: -84.4791 },
  'ohio state':      { lat: 40.0061,  lng: -83.0283 },
  'illinois':        { lat: 40.1020,  lng: -88.2272 },
  'purdue':          { lat: 40.4237,  lng: -86.9212 },
  'iowa':            { lat: 41.6611,  lng: -91.5302 },
  'minnesota':       { lat: 44.9778,  lng: -93.2650 },
  'wisconsin':       { lat: 43.0722,  lng: -89.4008 },
  'penn state':      { lat: 40.7982,  lng: -77.8599 },
  'rutgers':         { lat: 40.5018,  lng: -74.4479 },
  'nebraska':        { lat: 40.8202,  lng: -96.7005 },
  'maryland':        { lat: 38.9869,  lng: -76.9426 },
  'northwestern':    { lat: 42.0565,  lng: -87.6753 },
  'texas':           { lat: 30.2849,  lng: -97.7341 },
  'oklahoma':        { lat: 35.2059,  lng: -97.4454 },
  'baylor':          { lat: 31.5493,  lng: -97.1467 },
  'tcu':             { lat: 32.7298,  lng: -97.2922 },
  'west virginia':   { lat: 39.6354,  lng: -79.9547 },
  'kansas state':    { lat: 39.1955,  lng: -96.5847 },
  'iowa state':      { lat: 42.0267,  lng: -93.6465 },
  'cincinnati':      { lat: 39.1329,  lng: -84.5150 },
  'houston':         { lat: 29.7199,  lng: -95.3422 },
  'utah':            { lat: 40.7649,  lng: -111.8421 },
  'colorado':        { lat: 40.0076,  lng: -105.2659 },
  'arizona':         { lat: 32.2319,  lng: -110.9501 },
  'washington':      { lat: 47.6553,  lng: -122.3035 },
  'oregon':          { lat: 44.0460,  lng: -123.0720 },
  'california':      { lat: 37.8716,  lng: -122.2727 },
  'stanford':        { lat: 37.4275,  lng: -122.1697 },
  'ucla':            { lat: 34.0689,  lng: -118.4452 },
};

function lookupCoords(schoolName, matchedSchool) {
  if (matchedSchool && matchedSchool.lat) return { lat: matchedSchool.lat, lng: matchedSchool.lng };
  const norm = schoolName.toLowerCase();
  for (const [key, coords] of Object.entries(KNOWN_COORDS)) {
    if (norm.includes(key) || key.includes(norm.split(' ')[0])) return coords;
  }
  return { lat: 38.5, lng: -96.0 }; // US center fallback
}

// ── Merge scraped data with existing YAML ────────────────────────────────────
function mergeChanges(existing, scraped, schools) {
  const existingSlugs = new Set(existing.map(e => e.slug));
  const added = [];
  const skipped = [];

  for (const raw of scraped) {
    const matched = matchSchool(raw.school_raw, schools);
    const slug = matched ? matched.slug : raw.school_raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    if (existingSlugs.has(slug)) {
      // Update date only if this is a newer entry of same type
      const existing_entry = existing.find(e => e.slug === slug);
      if (existing_entry && raw.date > existing_entry.date) {
        existing_entry.date = raw.date;
        log(`Updated date for ${slug}`);
      }
      skipped.push(slug);
      continue;
    }

    const coords = lookupCoords(raw.school_raw, matched);
    const espnId = matched ? (matched.espn_id || null) : null;

    const newEntry = {
      school:          matched ? matched.name : raw.school_raw,
      slug:            slug,
      espn_id:         espnId || '',
      abbreviation:    matched ? (matched.abbreviation || '') : '',
      conference:      matched ? (matched.conference || '') : '',
      conference_slug: matched ? (matched.conference_slug || '') : '',
      division:        matched ? (matched.division || 'D1') : 'D1',
      state:           matched ? (matched.state || '') : '',
      lat:             coords.lat,
      lng:             coords.lng,
      city:            matched ? (matched.city || '') : '',
      logo_url:        espnId ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png` : '',
      change_type:     raw.change_type,
      impact:          'medium', // Default — update manually after review
      outgoing_coach:  raw.outgoing_coach || null,
      incoming_coach:  raw.incoming_coach || null,
      date:            raw.date,
      story_url:       raw.story_url,
      recruiting_note: generateRecruitingNote(raw.change_type, matched ? matched.name : raw.school_raw, matched),
      roster_spots:    estimateRosterSpots(raw.change_type),
      chain_reaction:  '',
      tags:            buildTags(raw.change_type, matched),
    };

    existing.push(newEntry);
    existingSlugs.add(slug);
    added.push(newEntry.school);
  }

  log(`Merge complete: ${added.length} new, ${skipped.length} skipped`);
  if (added.length) ok(`New entries: ${added.join(', ')}`);

  return existing;
}

function generateRecruitingNote(changeType, schoolName, matchedSchool) {
  const conf = matchedSchool ? matchedSchool.conference || '' : '';
  const notes = {
    fired:   `${schoolName} has made a coaching change. Roster spots expected to open. Contact the program directly to gauge opportunities. ${conf ? conf + ' exposure.' : ''}`,
    hired:   `New coach at ${schoolName} will be actively building roster via transfer portal. Early contact is key. ${conf ? conf + ' exposure.' : ''}`,
    opening: `${schoolName} coaching search underway. Multiple spots will be available. High-urgency window — apply now. ${conf ? conf + ' exposure.' : ''}`,
    rumor:   `Unconfirmed coaching news at ${schoolName}. Monitor situation before reaching out. Could create opportunity within weeks.`,
  };
  return notes[changeType] || notes.rumor;
}

function estimateRosterSpots(changeType) {
  const spotMap = { fired: 4, hired: 3, opening: 5, rumor: 0 };
  return spotMap[changeType] || 0;
}

function buildTags(changeType, matchedSchool) {
  const tags = [];
  if (matchedSchool) {
    const conf = matchedSchool.conference || '';
    if (conf.includes('Big Ten'))  tags.push('Big Ten');
    else if (conf.includes('SEC')) tags.push('SEC');
    else if (conf.includes('ACC')) tags.push('ACC');
    else if (conf.includes('Big 12')) tags.push('Big 12');
    else if (conf.includes('Big East')) tags.push('Big East');
    if (matchedSchool.division === 'D1') tags.push('Power 4');
  }
  const typeLabels = { fired: 'Staff Dismissed', hired: 'New Staff', opening: 'Position Open', rumor: 'Watch List' };
  tags.push(typeLabels[changeType] || changeType);
  if (changeType === 'fired' || changeType === 'opening') tags.push('Portal Opportunity');
  return tags;
}

// ── Write YAML ───────────────────────────────────────────────────────────────
function buildYaml(changes, existingMeta) {
  const breakdown = { fired: 0, hired: 0, opening: 0, rumor: 0 };
  for (const c of changes) {
    if (breakdown[c.change_type] !== undefined) breakdown[c.change_type]++;
  }

  const doc = {
    changes,
    meta: {
      last_updated:    TODAY,
      source_1:        'https://hoopdirt.com/coaching-changes/',
      source_2:        'https://www.espn.com/mens-college-basketball/story/_/id/48167700/coaching-carousel-tracker-firings-openings-candidates-hirings-buzz-2026',
      scraper_version: '1.0.0',
      total_changes:   changes.length,
      breakdown,
    }
  };

  const header = [
    '# Florida Coastal Prep — College Basketball Coaching Changes Tracker',
    `# Source: HoopDirt, ESPN Coaching Carousel, on3.com`,
    `# Updated: ${TODAY}`,
    `# Maintained by: automated scraper (scripts/scrape-coaching-changes.js)`,
    '#',
    '# change_type values: fired | hired | opening | rumor',
    '# impact values: high | medium | low',
    '# roster_spots: estimated open scholarships created by the change',
    '',
  ].join('\n');

  return header + yaml.dump(doc, {
    indent: 2,
    lineWidth: 120,
    quotingType: '"',
    forceQuotes: false,
  });
}

// ── Git commit ───────────────────────────────────────────────────────────────
function gitCommit(newCount) {
  try {
    execSync(`git -C "${ROOT}" add _data/coaching_changes.yml`, { stdio: 'pipe' });
    const msg = `chore: auto-update coaching changes tracker (${newCount} new, ${TODAY})`;
    execSync(`git -C "${ROOT}" commit -m "${msg}"`, { stdio: 'pipe' });
    ok(`Git commit created: "${msg}"`);
  } catch (e) {
    if (e.message.includes('nothing to commit')) {
      log('No changes to commit — data is already up to date.');
    } else {
      err(`Git commit failed: ${e.message}`);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}FCP Coaching Changes Scraper${C.reset}`);
  console.log(`Mode: ${WRITE_MODE ? C.green + 'WRITE' : C.yellow + 'DRY RUN'}${C.reset}`);
  console.log(`Date: ${TODAY}\n`);

  // 1. Load existing data
  const existing = loadExistingData();
  const existingChanges = existing.changes || [];
  const beforeCount = existingChanges.length;
  log(`Loaded ${beforeCount} existing entries from coaching_changes.yml`);

  // 2. Load schools for metadata enrichment
  const schools = loadSchools();
  log(`Loaded ${schools.length} schools from schools.yml`);

  // 3. Scrape sources sequentially (no parallel — per user requirement)
  const espnChanges = await scrapeESPN();
  await sleep(1500); // polite delay between requests
  const hoopdirtChanges = await scrapeHoopDirt();

  const allScraped = [...espnChanges, ...hoopdirtChanges];
  log(`\nTotal scraped entries: ${allScraped.length}`);

  if (allScraped.length === 0) {
    warn('No entries scraped — check source selectors or network access.');
    warn('This can happen in CI environments without outbound access.');
    warn('Existing data preserved unchanged.');
    process.exit(0);
  }

  // 4. Merge
  const merged = mergeChanges(existingChanges, allScraped, schools);
  const newCount = merged.length - beforeCount;

  // 5. Sort by date desc, then roster_spots desc
  merged.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return (b.roster_spots || 0) - (a.roster_spots || 0);
  });

  // 6. Build final YAML
  const output = buildYaml(merged, existing.meta);

  // 7. Write or print
  if (WRITE_MODE) {
    writeFileSync(DATA_FILE, output, 'utf8');
    ok(`Written to ${DATA_FILE}`);
    if (newCount > 0) {
      gitCommit(newCount);
    } else {
      log('No new changes — skipping git commit.');
    }
  } else {
    console.log('\n─── DRY RUN OUTPUT (not written) ───\n');
    console.log(output.slice(0, 3000) + (output.length > 3000 ? '\n... [truncated]' : ''));
    console.log(`\n→ Run with --write to save changes (${newCount} new entries would be added)`);
  }

  console.log(`\n${C.bold}Done.${C.reset} ${merged.length} total entries (${newCount} new)\n`);
}

main().catch(e => {
  err(`Fatal: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
