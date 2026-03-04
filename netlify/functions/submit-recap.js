const https = require("https");

// ── GitHub API helper ──────────────────────────────────────────────
function ghAPI(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "api.github.com",
      path: `/repos/CoachD23/fcp-jekyll-site${path}`,
      method,
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "fcp-recap-bot",
        Accept: "application/vnd.github.v3+json",
        ...(data && { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }),
      },
    };
    const req = https.request(opts, (res) => {
      let chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) reject({ status: res.statusCode, body: json });
          else resolve(json);
        } catch {
          reject({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Slug helper ────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ── ESPN-style title generator ─────────────────────────────────────
function generateTitle(opponent, fcpScore, oppScore, significance, isWin) {
  const margin = Math.abs(fcpScore - oppScore);
  let verb;
  if (isWin) {
    if (margin >= 20) verb = "Dominate";
    else if (margin >= 10) verb = "Roll Past";
    else if (margin >= 5) verb = "Down";
    else verb = "Edge";
  } else {
    if (margin >= 20) verb = "Fall to";
    else if (margin >= 10) verb = "Lose to";
    else verb = "Fall Short Against";
  }

  const sigTag = significance && significance !== "Regular Season" ? ` ${significance}` : "";
  const result = isWin ? "Win" : "Loss";
  return `Spartans ${verb} ${opponent} ${fcpScore}-${oppScore} in${sigTag} ${result}`;
}

// ── ESPN-style body generator ──────────────────────────────────────
function generateBody(data) {
  const {
    opponent, fcpScore, oppScore, team, location, venueName,
    players, highlights, coachQuote, significance, gameDate, imagePath,
  } = data;

  const isWin = fcpScore > oppScore;
  const margin = Math.abs(fcpScore - oppScore);
  const title = generateTitle(opponent, fcpScore, oppScore, significance, isWin);
  const slug = `game-recap-vs-${slugify(opponent)}`;
  const dateStr = gameDate; // YYYY-MM-DD

  // ── Front matter ──
  const description = `Game recap: FCP Spartans ${isWin ? "defeat" : "fall to"} ${opponent} ${fcpScore}-${oppScore}${significance !== "Regular Season" ? ` in ${significance.toLowerCase()} action` : ""}${location === "Home" ? " at home" : " on the road"}.`;
  const excerpt = generateExcerpt(opponent, fcpScore, oppScore, isWin, margin, significance);

  let md = `---
layout: post
title: "${title}"
date: ${dateStr}
categories: [game-recap]
image: ${imagePath}
description: "${description}"
excerpt: "${excerpt}"
---

`;

  // ── Opening paragraph ──
  const locPhrase = location === "Home"
    ? (venueName ? `hosted ${opponent} at ${venueName}` : `hosted ${opponent}`)
    : (venueName ? `traveled to ${venueName} to take on ${opponent}` : `hit the road to face ${opponent}`);

  const sigPhrase = significance && significance !== "Regular Season"
    ? `in ${significance.toLowerCase()} action`
    : "";

  if (isWin) {
    if (margin >= 20) {
      md += `The FCP Spartans ${locPhrase} ${sigPhrase}, delivering a commanding **${fcpScore}-${oppScore}** victory in dominant fashion.\n\n`;
    } else if (margin >= 10) {
      md += `The FCP Spartans ${locPhrase} ${sigPhrase}, cruising to a **${fcpScore}-${oppScore}** win behind a balanced effort.\n\n`;
    } else if (margin >= 5) {
      md += `The FCP Spartans ${locPhrase} ${sigPhrase}, pulling away for a **${fcpScore}-${oppScore}** victory.\n\n`;
    } else {
      md += `In a hard-fought battle, the FCP Spartans ${locPhrase} ${sigPhrase}, holding on for a **${fcpScore}-${oppScore}** win in a game that came down to the wire.\n\n`;
    }
  } else {
    if (margin <= 5) {
      md += `The FCP Spartans ${locPhrase} ${sigPhrase} in a tightly contested game, ultimately falling **${fcpScore}-${oppScore}** in a battle that could have gone either way.\n\n`;
    } else {
      md += `The FCP Spartans ${locPhrase} ${sigPhrase}, falling **${fcpScore}-${oppScore}** despite a competitive effort.\n\n`;
    }
  }

  // ── Team tag ──
  if (team) {
    md += `**Team:** ${team}\n\n`;
  }

  // ── Notable Performances ──
  if (players && players.length > 0) {
    md += `## Notable Performances\n\n`;
    md += `| Player | Stats |\n|--------|-------|\n`;
    players.forEach((p) => {
      md += `| ${p.name} | ${p.stats} |\n`;
    });
    md += `\n`;
  }

  // ── Game Highlights ──
  if (highlights && highlights.trim()) {
    md += `## Game Highlights\n\n${highlights.trim()}\n\n`;
  }

  // ── Coach Quote ──
  if (coachQuote && coachQuote.trim()) {
    md += `> "${coachQuote.trim()}"\n> — FCP Coaching Staff\n\n`;
  }

  // ── Footer ──
  md += `---\n\n`;
  md += `*Follow FCP basketball on [Instagram](https://instagram.com/FLCoastalPrep) and [X](https://x.com/FLCoastalPrep).*\n\n`;
  md += `**Interested in joining the Spartans? [Apply now](/apply/) or [contact our coaching staff](/contact/).**\n`;

  return { title, slug, dateStr, markdown: md, imagePath };
}

function generateExcerpt(opponent, fcpScore, oppScore, isWin, margin, significance) {
  const sigPhrase = significance !== "Regular Season" ? ` in ${significance.toLowerCase()} play` : "";
  if (isWin) {
    if (margin >= 15) return `The Spartans cruised past ${opponent} ${fcpScore}-${oppScore}${sigPhrase} behind a dominant performance.`;
    if (margin >= 5) return `The Spartans topped ${opponent} ${fcpScore}-${oppScore}${sigPhrase} behind a balanced effort.`;
    return `The Spartans edged ${opponent} ${fcpScore}-${oppScore}${sigPhrase} in a hard-fought contest.`;
  }
  if (margin <= 5) return `The Spartans fell just short against ${opponent} ${fcpScore}-${oppScore}${sigPhrase} in a tightly contested game.`;
  return `The Spartans fell to ${opponent} ${fcpScore}-${oppScore}${sigPhrase} despite a competitive effort.`;
}

// ── Main handler ───────────────────────────────────────────────────
exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  try {
    const body = JSON.parse(event.body);

    // ── Validate access code ──
    if (String(body.accessCode) !== String(process.env.RECAP_ACCESS_CODE)) {
      return respond(403, { error: "Invalid access code" });
    }

    // ── Validate required fields ──
    if (!body.opponent || !body.fcpScore || !body.oppScore || !body.gameDate) {
      return respond(400, { error: "Missing required fields: opponent, fcpScore, oppScore, gameDate" });
    }

    const oppSlug = slugify(body.opponent);
    const dateStr = body.gameDate;
    const branchName = `recap/${dateStr}-vs-${oppSlug}`;
    const imageName = `recap-${dateStr}-vs-${oppSlug}.jpg`;
    const imagePath = `/assets/images/blog/${imageName}`;

    // ── Generate markdown ──
    const post = generateBody({
      opponent: body.opponent,
      fcpScore: parseInt(body.fcpScore, 10),
      oppScore: parseInt(body.oppScore, 10),
      team: body.team || "",
      location: body.location || "Home",
      venueName: body.venueName || "",
      players: body.players || [],
      highlights: body.highlights || "",
      coachQuote: body.coachQuote || "",
      significance: body.significance || "Regular Season",
      gameDate: dateStr,
      imagePath,
    });

    // ── Get master HEAD ──
    const masterRef = await ghAPI("GET", "/git/ref/heads/master");
    const masterSHA = masterRef.object.sha;

    // ── Create branch ──
    try {
      await ghAPI("POST", "/git/refs", {
        ref: `refs/heads/${branchName}`,
        sha: masterSHA,
      });
    } catch (e) {
      // Branch might already exist — update it
      if (e.status === 422) {
        await ghAPI("PATCH", `/git/refs/heads/${branchName}`, {
          sha: masterSHA,
          force: true,
        });
      } else {
        throw e;
      }
    }

    // ── Upload image blob (if provided) ──
    let imageBlob = null;
    if (body.imageBase64) {
      // Strip data URL prefix if present
      const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      imageBlob = await ghAPI("POST", "/git/blobs", {
        content: base64Data,
        encoding: "base64",
      });
    }

    // ── Upload markdown blob ──
    const mdBlob = await ghAPI("POST", "/git/blobs", {
      content: Buffer.from(post.markdown).toString("base64"),
      encoding: "base64",
    });

    // ── Get the base tree from master ──
    const masterCommit = await ghAPI("GET", `/git/commits/${masterSHA}`);
    const baseTreeSHA = masterCommit.tree.sha;

    // ── Build new tree ──
    const treeItems = [
      {
        path: `_posts/${dateStr}-game-recap-vs-${oppSlug}.md`,
        mode: "100644",
        type: "blob",
        sha: mdBlob.sha,
      },
    ];

    if (imageBlob) {
      treeItems.push({
        path: `assets/images/blog/${imageName}`,
        mode: "100644",
        type: "blob",
        sha: imageBlob.sha,
      });
    }

    const newTree = await ghAPI("POST", "/git/trees", {
      base_tree: baseTreeSHA,
      tree: treeItems,
    });

    // ── Create commit ──
    const newCommit = await ghAPI("POST", "/git/commits", {
      message: `blog: Add game recap — ${body.opponent} (${body.fcpScore}-${body.oppScore})`,
      tree: newTree.sha,
      parents: [masterSHA],
      author: {
        name: "FCP Recap Bot",
        email: "130697360+CoachD23@users.noreply.github.com",
        date: new Date().toISOString(),
      },
    });

    // ── Update branch ref ──
    await ghAPI("PATCH", `/git/refs/heads/${branchName}`, {
      sha: newCommit.sha,
    });

    // ── Create Pull Request ──
    const pr = await ghAPI("POST", "/pulls", {
      title: `🏀 Game Recap: ${post.title}`,
      body: `## Auto-Generated Game Recap\n\n**${body.opponent}** — ${body.fcpScore}-${body.oppScore}\n**Date:** ${dateStr}\n**Team:** ${body.team || "Not specified"}\n\n---\n\n### Preview\n${post.markdown.substring(0, 500)}...\n\n---\n\n*Submitted via the FCP Game Recap form. Review the markdown, edit if needed, then merge to publish.*`,
      head: branchName,
      base: "master",
    });

    return respond(200, {
      success: true,
      message: "Game recap submitted! Coach D will review and publish it.",
      prUrl: pr.html_url,
      prNumber: pr.number,
    });
  } catch (err) {
    console.error("Submit recap error:", err);
    return respond(500, {
      error: "Something went wrong submitting the recap. Please try again.",
      detail: typeof err === "object" ? JSON.stringify(err) : String(err),
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function respond(code, body) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(body),
  };
}
