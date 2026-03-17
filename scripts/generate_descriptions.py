#!/usr/bin/env python3
"""
FCP School Descriptions Generator
==================================
Generates unique basketball program descriptions for all 1,852 schools in
_data/recruiting/schools.yml using Claude Haiku in parallel async workers.

Usage:
    export ANTHROPIC_API_KEY=sk-...
    python3 scripts/generate_descriptions.py              # run all missing
    python3 scripts/generate_descriptions.py --dry-run    # preview 3 schools, no writes
    python3 scripts/generate_descriptions.py --limit 50   # process only N schools
    python3 scripts/generate_descriptions.py --workers 10 # concurrency (default: 10)
    python3 scripts/generate_descriptions.py --reset-slug some-school-slug  # rewrite one

Output appends to: _data/recruiting/school_descriptions.yml
Progress tracked:  scripts/desc_progress.json
"""

import argparse
import asyncio
import json
import logging
import os
import re
import sys
import textwrap
import time
from pathlib import Path

import anthropic
import yaml

# ─── Paths ────────────────────────────────────────────────────────────────────
REPO_ROOT       = Path(__file__).parent.parent
SCHOOLS_FILE    = REPO_ROOT / "_data/recruiting/schools.yml"
DESCRIPTIONS_FILE = REPO_ROOT / "_data/recruiting/school_descriptions.yml"
VOICE_GUIDE_FILE  = REPO_ROOT / "_data/recruiting/voice_guide.yml"
PROGRESS_FILE     = Path(__file__).parent / "desc_progress.json"

# ─── Model ────────────────────────────────────────────────────────────────────
MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 600

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("fcp-gen")


# ─── Load data ────────────────────────────────────────────────────────────────

def load_schools() -> list[dict]:
    with open(SCHOOLS_FILE) as f:
        return yaml.safe_load(f)


def load_descriptions() -> dict[str, str]:
    if not DESCRIPTIONS_FILE.exists():
        return {}
    with open(DESCRIPTIONS_FILE) as f:
        data = yaml.safe_load(f) or {}
    return data


def load_voice_guide() -> dict:
    with open(VOICE_GUIDE_FILE) as f:
        return yaml.safe_load(f)


def load_progress() -> dict:
    if not PROGRESS_FILE.exists():
        return {}
    with open(PROGRESS_FILE) as f:
        return json.load(f)


def save_progress(progress: dict) -> None:
    PROGRESS_FILE.parent.mkdir(exist_ok=True)
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


# ─── Voice assignment ─────────────────────────────────────────────────────────

DIVISION_VOICE_BIAS: dict[str, list[str]] = {
    # High-major D1 → Advocate, Storyteller, Motivator
    "D1":   ["V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10"],
    "D2":   ["V01", "V02", "V05", "V07", "V09", "V03", "V04", "V06", "V10", "V08"],
    "D3":   ["V02", "V05", "V09", "V10", "V07", "V01", "V03", "V06", "V04", "V08"],
    "JUCO": ["V05", "V09", "V02", "V07", "V04", "V01", "V10", "V03", "V06", "V08"],
    "NAIA": ["V10", "V09", "V02", "V05", "V07", "V01", "V03", "V06", "V04", "V08"],
}

def pick_voice(school_index: int, division: str, voice_guide: dict) -> dict:
    """Pick a voice for this school using rotation + division bias."""
    voices_by_id = {v["id"]: v for v in voice_guide["voices"]}
    pool = DIVISION_VOICE_BIAS.get(division, DIVISION_VOICE_BIAS["D1"])
    voice_id = pool[school_index % len(pool)]
    return voices_by_id[voice_id]


def pick_cta(school_index: int, voice_guide: dict) -> str:
    """Pick a CTA variant, rotating through 8 options."""
    variants = voice_guide["fcp_cta_variants"]
    return variants[school_index % len(variants)]["text"].strip()


# ─── Prompt builder ───────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a college basketball recruiting expert writing program descriptions for \
Florida Coastal Prep's online recruiting directory. Your descriptions help high \
school and post-graduate players evaluate whether a program fits their goals.

Rules you must follow without exception:
1. Write 150-250 words total (including the CTA at the end).
2. Never open with: "The [nickname] compete", "Located in", "Founded in", \
"Situated in", "Nestled in", or "Known for".
3. Always name the head coach naturally in the body of the description.
4. Always name the conference.
5. Never invent win totals, rankings, or specific records — describe tendencies, \
not fabricated stats.
6. Never use these phrases: "look no further", "world-class", "state-of-the-art", \
"second to none", "truly unique", "amazing opportunity", "dream come true", \
"don't miss out", "without a doubt", "one of the best".
7. End the description with the exact CTA text provided — do not paraphrase it.
8. Output ONLY the description text. No YAML, no markdown, no explanation.
"""


def build_user_prompt(school: dict, voice: dict, cta: str) -> str:
    division_label = {
        "D1": "NCAA Division I",
        "D2": "NCAA Division II",
        "D3": "NCAA Division III",
        "JUCO": "NJCAA (Junior College)",
        "NAIA": "NAIA",
    }.get(school.get("division", ""), school.get("division", ""))

    coach = school.get("head_coach") or "the head coach"
    state = school.get("state", "")
    city  = school.get("city", "")
    location_hint = f"{city}, {state}".strip(", ") if city else state

    prompt = f"""\
Write a recruiting directory description for {school['name']} \
({school.get('nickname', '')} — {division_label}) \
in the {school['conference']}.
{f'Location: {location_hint}' if location_hint else ''}
Head coach: {coach}

Voice archetype: {voice['id']} — {voice['name']}
Tone: {voice['tone']}
Writing style guidance: {voice['writing_style'].strip()}
Opener pattern: {voice['opener_pattern'].strip()}

End with this exact CTA (do not paraphrase):
---
{cta}
---
"""
    return prompt.strip()


# ─── Validation ───────────────────────────────────────────────────────────────

BANNED_OPENERS_PATTERNS = [
    r"^the \w+ compete",
    r"^located in",
    r"^founded in",
    r"^situated in",
    r"^nestled in",
    r"^known for",
]

BANNED_PHRASES = [
    "look no further", "don't miss out", "without a doubt",
    "world-class", "state-of-the-art", "second to none",
    "truly unique", "amazing opportunity", "dream come true",
]

FCP_REQUIRED = ["florida coastal prep", "floridacoastalprep.com"]


def validate(text: str, slug: str) -> list[str]:
    """Return a list of validation error strings. Empty = valid."""
    errors = []
    lower = text.lower().strip()
    words = text.split()

    # Word count
    if len(words) < 140:
        errors.append(f"Too short: {len(words)} words (min 150)")
    if len(words) > 280:
        errors.append(f"Too long: {len(words)} words (max 250)")

    # Banned openers
    for pat in BANNED_OPENERS_PATTERNS:
        if re.match(pat, lower):
            errors.append(f"Banned opener matched: '{pat}'")

    # Banned phrases
    for phrase in BANNED_PHRASES:
        if phrase in lower:
            errors.append(f"Banned phrase found: '{phrase}'")

    # FCP CTA present
    if not any(req in lower for req in FCP_REQUIRED):
        errors.append("Missing FCP reference in CTA")

    return errors


# ─── YAML append ──────────────────────────────────────────────────────────────

def append_description(slug: str, text: str) -> None:
    """Append a single entry to school_descriptions.yml as a block scalar."""
    # Normalize whitespace: collapse to single spaces, strip
    clean = " ".join(text.split())

    # Wrap to 100 chars for YAML readability, indented 2 spaces
    wrapped_lines = textwrap.wrap(clean, width=100)
    indented = "\n".join("  " + line for line in wrapped_lines)

    entry = f"{slug}: >-\n{indented}\n"

    with open(DESCRIPTIONS_FILE, "a") as f:
        f.write(entry)


# ─── Async worker ─────────────────────────────────────────────────────────────

async def generate_one(
    client: anthropic.AsyncAnthropic,
    school: dict,
    school_index: int,
    voice_guide: dict,
    semaphore: asyncio.Semaphore,
    dry_run: bool,
) -> tuple[str, bool, str]:
    """
    Generate + validate + write one school description.
    Returns (slug, success, message).
    """
    slug = school["slug"]
    division = school.get("division", "D1")

    voice = pick_voice(school_index, division, voice_guide)
    cta   = pick_cta(school_index, voice_guide)

    system = SYSTEM_PROMPT
    user   = build_user_prompt(school, voice, cta)

    async with semaphore:
        for attempt in range(3):
            try:
                response = await client.messages.create(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    system=system,
                    messages=[{"role": "user", "content": user}],
                )
                text = response.content[0].text.strip()
                break
            except anthropic.RateLimitError:
                wait = 2 ** (attempt + 1)
                log.warning(f"  Rate limit hit for {slug}, waiting {wait}s...")
                await asyncio.sleep(wait)
            except anthropic.APIError as e:
                log.error(f"  API error for {slug}: {e}")
                return (slug, False, f"API error: {e}")
        else:
            return (slug, False, "Max retries exceeded (rate limit)")

    errors = validate(text, slug)
    if errors:
        log.warning(f"  VALIDATION FAILED for {slug}: {errors}")
        # Retry once with a stricter note
        retry_note = "IMPORTANT: " + "; ".join(errors) + ". Fix these issues."
        try:
            response = await client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system,
                messages=[
                    {"role": "user", "content": user},
                    {"role": "assistant", "content": text},
                    {"role": "user", "content": retry_note},
                ],
            )
            text = response.content[0].text.strip()
            errors = validate(text, slug)
        except Exception as e:
            log.error(f"  Retry failed for {slug}: {e}")

    if errors:
        return (slug, False, f"Validation errors after retry: {errors}")

    if dry_run:
        log.info(f"  [DRY RUN] {slug} ({voice['id']} {voice['name']}) — {len(text.split())}w")
        log.info(f"  Preview:\n    {text[:200]}...")
        return (slug, True, "dry-run")

    append_description(slug, text)
    return (slug, True, f"{voice['id']} {voice['name']} — {len(text.split())}w")


# ─── Main orchestrator ────────────────────────────────────────────────────────

async def run(args: argparse.Namespace) -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.error("ANTHROPIC_API_KEY not set. Run: export ANTHROPIC_API_KEY=sk-...")
        sys.exit(1)

    log.info("Loading data files...")
    schools      = load_schools()
    descriptions = load_descriptions()
    voice_guide  = load_voice_guide()
    progress     = load_progress()

    # Build the todo list: schools without descriptions
    done_slugs = set(descriptions.keys())

    # Handle --reset-slug: remove from done set so it gets regenerated
    if args.reset_slug:
        done_slugs.discard(args.reset_slug)
        log.info(f"Reset slug '{args.reset_slug}' — will regenerate.")

    todo = [s for s in schools if s["slug"] not in done_slugs]
    total_missing = len(todo)

    if args.limit:
        todo = todo[: args.limit]

    log.info(f"Schools total:      {len(schools)}")
    log.info(f"Already have desc:  {len(done_slugs)}")
    log.info(f"Need descriptions:  {total_missing}")
    log.info(f"This run will do:   {len(todo)}")
    log.info(f"Workers:            {args.workers}")
    log.info(f"Model:              {MODEL}")
    log.info(f"Dry run:            {args.dry_run}")
    log.info("─" * 60)

    if not todo:
        log.info("Nothing to do — all schools have descriptions.")
        return

    client = anthropic.AsyncAnthropic(api_key=api_key)
    semaphore = asyncio.Semaphore(args.workers)

    # Give each school a stable index for voice/CTA rotation
    # Use its position in the full schools list so rotation is consistent across runs
    slug_to_index = {s["slug"]: i for i, s in enumerate(schools)}

    batch_size = 50
    succeeded  = 0
    failed     = 0
    failed_slugs: list[str] = []

    for batch_start in range(0, len(todo), batch_size):
        batch = todo[batch_start : batch_start + batch_size]
        batch_num = batch_start // batch_size + 1
        log.info(f"Batch {batch_num} — schools {batch_start+1}–{batch_start+len(batch)}")

        tasks = [
            generate_one(
                client,
                school,
                slug_to_index[school["slug"]],
                voice_guide,
                semaphore,
                args.dry_run,
            )
            for school in batch
        ]

        results = await asyncio.gather(*tasks)

        batch_ok   = 0
        batch_fail = 0
        for slug, ok, msg in results:
            if ok:
                succeeded += 1
                batch_ok  += 1
                progress[slug] = {"status": "done", "note": msg, "ts": int(time.time())}
                log.info(f"  OK  {slug}  ({msg})")
            else:
                failed += 1
                batch_fail += 1
                failed_slugs.append(slug)
                progress[slug] = {"status": "failed", "note": msg, "ts": int(time.time())}
                log.warning(f"  FAIL {slug}: {msg}")

        save_progress(progress)
        log.info(f"Batch {batch_num} done: {batch_ok} OK, {batch_fail} failed")
        log.info(f"Running total: {succeeded} done / {failed} failed")
        log.info("─" * 60)

        # Polite pause between batches to avoid sustained rate pressure
        if batch_start + batch_size < len(todo):
            await asyncio.sleep(1)

    log.info("=" * 60)
    log.info(f"COMPLETE: {succeeded} descriptions written, {failed} failed")
    if failed_slugs:
        log.warning(f"Failed slugs: {failed_slugs}")
        log.warning("Re-run the script — failed slugs will be retried automatically.")
    log.info(f"Output: {DESCRIPTIONS_FILE}")
    log.info(f"Progress: {PROGRESS_FILE}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate FCP recruiting directory descriptions using Claude Haiku."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview output for the first 3 schools without writing anything.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Process at most N schools (0 = all missing).",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=10,
        help="Number of parallel Haiku workers (default: 10).",
    )
    parser.add_argument(
        "--reset-slug",
        type=str,
        default="",
        help="Force-regenerate a specific school slug even if it already has a description.",
    )
    args = parser.parse_args()

    if args.dry_run and not args.limit:
        args.limit = 3  # default dry-run shows 3 schools

    asyncio.run(run(args))


if __name__ == "__main__":
    main()
