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
        "User-Agent": "fcp-content-bot",
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

// ── Helpers ────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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

// ── Internal link mapping per category ────────────────────────────
const CATEGORY_LINKS = {
  "game-recap": {
    primary: { url: "/post-grad/", text: "Post-Grad Basketball Program" },
    secondary: { url: "/apply/", text: "Apply now" },
    cta: "Join the Spartans",
  },
  "daily-life": {
    primary: { url: "/housing/", text: "Housing & Campus Life" },
    secondary: { url: "/apply/", text: "Apply now" },
    cta: "Experience FCP Life",
  },
  commitments: {
    primary: { url: "/post-grad/", text: "Post-Grad Program" },
    secondary: { url: "/apply/", text: "Apply now" },
    cta: "Follow Their Path",
  },
  training: {
    primary: { url: "/training/", text: "Spartan Training Center" },
    secondary: { url: "/apply/", text: "Apply now" },
    cta: "Train Like a Spartan",
  },
  "program-news": {
    primary: { url: "/about/", text: "About FCP" },
    secondary: { url: "/contact/", text: "Contact our staff" },
    cta: "Learn About FCP",
  },
  alumni: {
    primary: { url: "/about/", text: "About FCP" },
    secondary: { url: "/apply/", text: "Apply now" },
    cta: "Join the FCP Family",
  },
};

function buildFooter(category) {
  const links = CATEGORY_LINKS[category] || CATEGORY_LINKS["program-news"];
  let footer = `---\n\n`;
  footer += `*Follow FCP basketball on [Instagram](https://instagram.com/FLCoastalPrep) and [X](https://x.com/FLCoastalPrep).*\n\n`;
  footer += `**${links.cta}?** [${links.primary.text}](${links.primary.url}) | [${links.secondary.text}](${links.secondary.url})\n`;
  return footer;
}

// ═══════════════════════════════════════════════════════════════════
// CATEGORY GENERATORS — each returns { title, slug, markdown }
// ═══════════════════════════════════════════════════════════════════

// ── 1. Game Recap ─────────────────────────────────────────────────
function generateGameRecap(body) {
  const opponent = body.opponent || "Opponent";
  const fcpScore = parseInt(body.fcpScore, 10) || 0;
  const oppScore = parseInt(body.oppScore, 10) || 0;
  const isWin = fcpScore > oppScore;
  const margin = Math.abs(fcpScore - oppScore);
  const team = body.team || "";
  const location = body.location || "Home";
  const venueName = body.venueName || "";
  const players = body.players || [];
  const highlights = body.highlights || "";
  const coachQuote = body.coachQuote || "";
  const significance = body.significance || "Regular Season";
  const dateStr = body.contentDate;

  // Title
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
  const sigTag = significance !== "Regular Season" ? ` ${significance}` : "";
  const result = isWin ? "Win" : "Loss";
  const title = `Spartans ${verb} ${opponent} ${fcpScore}-${oppScore} in${sigTag} ${result}`;
  const slug = `game-recap-vs-${slugify(opponent)}`;

  // Description & Excerpt
  const description = `Game recap: FCP Spartans ${isWin ? "defeat" : "fall to"} ${opponent} ${fcpScore}-${oppScore}${significance !== "Regular Season" ? ` in ${significance.toLowerCase()} action` : ""}${location === "Home" ? " at home" : " on the road"}.`;

  let excerpt;
  const sigPhrase = significance !== "Regular Season" ? ` in ${significance.toLowerCase()} play` : "";
  if (isWin) {
    if (margin >= 15) excerpt = `The Spartans cruised past ${opponent} ${fcpScore}-${oppScore}${sigPhrase} behind a dominant performance.`;
    else if (margin >= 5) excerpt = `The Spartans topped ${opponent} ${fcpScore}-${oppScore}${sigPhrase} behind a balanced effort.`;
    else excerpt = `The Spartans edged ${opponent} ${fcpScore}-${oppScore}${sigPhrase} in a hard-fought contest.`;
  } else {
    if (margin <= 5) excerpt = `The Spartans fell just short against ${opponent} ${fcpScore}-${oppScore}${sigPhrase} in a tightly contested game.`;
    else excerpt = `The Spartans fell to ${opponent} ${fcpScore}-${oppScore}${sigPhrase} despite a competitive effort.`;
  }

  // Body
  let md = "";

  // Opening
  const locPhrase = location === "Home"
    ? (venueName ? `hosted ${opponent} at ${venueName}` : `hosted ${opponent}`)
    : (venueName ? `traveled to ${venueName} to take on ${opponent}` : `hit the road to face ${opponent}`);
  const sigPhraseBody = significance !== "Regular Season" ? `in ${significance.toLowerCase()} action` : "";

  if (isWin) {
    if (margin >= 20) md += `The FCP Spartans ${locPhrase} ${sigPhraseBody}, delivering a commanding **${fcpScore}-${oppScore}** victory in dominant fashion.\n\n`;
    else if (margin >= 10) md += `The FCP Spartans ${locPhrase} ${sigPhraseBody}, cruising to a **${fcpScore}-${oppScore}** win behind a balanced effort.\n\n`;
    else if (margin >= 5) md += `The FCP Spartans ${locPhrase} ${sigPhraseBody}, pulling away for a **${fcpScore}-${oppScore}** victory.\n\n`;
    else md += `In a hard-fought battle, the FCP Spartans ${locPhrase} ${sigPhraseBody}, holding on for a **${fcpScore}-${oppScore}** win in a game that came down to the wire.\n\n`;
  } else {
    if (margin <= 5) md += `The FCP Spartans ${locPhrase} ${sigPhraseBody} in a tightly contested game, ultimately falling **${fcpScore}-${oppScore}** in a battle that could have gone either way.\n\n`;
    else md += `The FCP Spartans ${locPhrase} ${sigPhraseBody}, falling **${fcpScore}-${oppScore}** despite a competitive effort.\n\n`;
  }

  if (team) md += `**Team:** ${team}\n\n`;

  if (players.length > 0) {
    md += `## Notable Performances\n\n| Player | Stats |\n|--------|-------|\n`;
    players.forEach((p) => { md += `| ${p.name} | ${p.stats} |\n`; });
    md += `\n`;
  }

  if (highlights.trim()) md += `## Game Highlights\n\n${highlights.trim()}\n\n`;
  if (coachQuote.trim()) md += `> "${coachQuote.trim()}"\n> — FCP Coaching Staff\n\n`;

  md += buildFooter("game-recap");

  return { title, slug, description, excerpt, body: md, category: "game-recap" };
}

// ── 2. Daily Life ─────────────────────────────────────────────────
function generateDailyLife(body) {
  const customTitle = body.title || "A Day at FCP";
  const caption = body.caption || "";
  const dateStr = body.contentDate;
  const slug = `daily-life-${slugify(customTitle)}`;

  const title = customTitle;
  const description = `Life at Florida Coastal Prep: ${customTitle.toLowerCase()}. See what daily life looks like for FCP Spartans.`;
  const excerpt = caption ? caption.substring(0, 160).trim() : `A glimpse into daily life at Florida Coastal Prep — ${customTitle.toLowerCase()}.`;

  let md = "";
  if (caption.trim()) {
    md += `${caption.trim()}\n\n`;
  } else {
    md += `Another great day at Florida Coastal Prep!\n\n`;
  }
  md += `Life at FCP is about more than basketball — it's about building lifelong friendships, growing as student-athletes, and creating memories that last a lifetime.\n\n`;
  md += `Explore more about [housing and campus life](/housing/) at Florida Coastal Prep.\n\n`;
  md += buildFooter("daily-life");

  return { title, slug, description, excerpt, body: md, category: "daily-life" };
}

// ── 3. Commitment ─────────────────────────────────────────────────
function generateCommitment(body) {
  const playerName = body.playerName || "Player";
  const school = body.school || "University";
  const position = body.position || "";
  const height = body.height || "";
  const hometown = body.hometown || "";
  const coachQuote = body.quote || "";
  const description_text = body.description || "";

  const title = `${playerName} Commits to ${school}`;
  const slug = `commitment-${slugify(playerName)}-${slugify(school)}`;
  const description = `FCP Spartan ${playerName} commits to ${school}. Another Florida Coastal Prep athlete advancing to the next level.`;
  const excerpt = `Congratulations to ${playerName} on committing to ${school}! Another FCP Spartan taking the next step in their basketball journey.`;

  let md = `Congratulations to **${playerName}** on committing to **${school}**!\n\n`;

  // Player details
  const details = [];
  if (position) details.push(`**Position:** ${position}`);
  if (height) details.push(`**Height:** ${height}`);
  if (hometown) details.push(`**Hometown:** ${hometown}`);
  if (details.length > 0) md += details.join(" | ") + "\n\n";

  if (description_text.trim()) md += `${description_text.trim()}\n\n`;
  else md += `${playerName} has been a standout performer during their time at Florida Coastal Prep, and this commitment is a testament to their hard work and dedication.\n\n`;

  if (coachQuote.trim()) md += `> "${coachQuote.trim()}"\n> — FCP Coaching Staff\n\n`;

  md += `This commitment continues the tradition of FCP Spartans advancing to the next level. Learn more about our [Post-Grad Basketball Program](/post-grad/) and how we prepare student-athletes for college basketball.\n\n`;
  md += buildFooter("commitments");

  return { title, slug, description, excerpt, body: md, category: "commitments" };
}

// ── 4. Training ───────────────────────────────────────────────────
function generateTraining(body) {
  const customTitle = body.title || "Training Session at the Spartan Center";
  const drillFocus = body.focus || "";
  const description_text = body.description || "";
  const playersInvolved = body.playersInvolved || "";

  const title = customTitle;
  const slug = `training-${slugify(customTitle)}`;
  const description = `FCP training report: ${customTitle.toLowerCase()}. Inside look at how Spartans develop at the Spartan Training Center.`;
  const excerpt = description_text ? description_text.substring(0, 160).trim() : `Inside look at today's training session at the Spartan Training Center.`;

  let md = "";
  if (drillFocus) md += `**Today's Focus:** ${drillFocus}\n\n`;
  if (description_text.trim()) md += `${description_text.trim()}\n\n`;
  else md += `The Spartans put in work today at the Spartan Training Center, continuing to build the habits that translate to game-day success.\n\n`;

  if (playersInvolved.trim()) md += `**Players Featured:** ${playersInvolved.trim()}\n\n`;

  md += `Our [Spartan Training Center](/training/) provides a professional development environment where student-athletes train year-round to reach their full potential.\n\n`;
  md += buildFooter("training");

  return { title, slug, description, excerpt, body: md, category: "training" };
}

// ── 5. Program News ───────────────────────────────────────────────
function generateProgramNews(body) {
  const customTitle = body.title || "FCP Program Update";
  const description_text = body.description || "";

  const title = customTitle;
  const slug = `news-${slugify(customTitle)}`;
  const description = `Florida Coastal Prep program update: ${customTitle.toLowerCase()}.`;
  const excerpt = description_text ? description_text.substring(0, 160).trim() : `Latest update from the Florida Coastal Prep basketball program.`;

  let md = "";
  if (description_text.trim()) md += `${description_text.trim()}\n\n`;
  else md += `Stay tuned for more details on this program update.\n\n`;

  md += `Learn more [about Florida Coastal Prep](/about/) and our mission to develop student-athletes on and off the court.\n\n`;
  md += buildFooter("program-news");

  return { title, slug, description, excerpt, body: md, category: "program-news" };
}

// ── 6. Alumni Update ──────────────────────────────────────────────
function generateAlumniUpdate(body) {
  const playerName = body.playerName || "FCP Alumni";
  const currentTeam = body.currentTeam || "";
  const description_text = body.update || "";

  const title = currentTeam
    ? `Alumni Spotlight: ${playerName} at ${currentTeam}`
    : `Alumni Spotlight: ${playerName}`;
  const slug = `alumni-${slugify(playerName)}`;
  const description = `FCP alumni update: ${playerName}${currentTeam ? ` currently at ${currentTeam}` : ""}. Where are they now?`;
  const excerpt = `Catching up with FCP alumni ${playerName}${currentTeam ? `, now at ${currentTeam}` : ""}. See how Spartans continue to succeed after FCP.`;

  let md = "";
  if (currentTeam) md += `**Current Team/School:** ${currentTeam}\n\n`;
  if (description_text.trim()) md += `${description_text.trim()}\n\n`;
  else md += `${playerName} continues to represent the Spartan family well. We're proud to see our alumni thriving at the next level.\n\n`;

  md += `Florida Coastal Prep has a tradition of developing athletes who succeed beyond our program. Learn more [about FCP](/about/) and our commitment to student-athlete success.\n\n`;
  md += buildFooter("alumni");

  return { title, slug, description, excerpt, body: md, category: "alumni" };
}

// ── Generator dispatch ────────────────────────────────────────────
const generators = {
  "game-recap": generateGameRecap,
  "daily-life": generateDailyLife,
  commitments: generateCommitment,
  training: generateTraining,
  "program-news": generateProgramNews,
  alumni: generateAlumniUpdate,
};

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════
exports.handler = async (event) => {
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

    // ── Validate category ──
    const category = body.category;
    if (!category || !generators[category]) {
      return respond(400, { error: `Invalid category. Must be one of: ${Object.keys(generators).join(", ")}` });
    }

    // ── Validate date ──
    const dateStr = body.contentDate;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return respond(400, { error: "Missing or invalid contentDate (YYYY-MM-DD)" });
    }

    // ── Category-specific validation ──
    if (category === "game-recap" && (!body.opponent || !body.fcpScore || !body.oppScore)) {
      return respond(400, { error: "Game recaps require: opponent, fcpScore, oppScore" });
    }

    // ── Generate content ──
    const gen = generators[category];
    const post = gen(body);

    // ── Build image path ──
    const imageName = `${post.category}-${dateStr}-${slugify(post.slug)}.jpg`;
    const imagePath = `/assets/images/blog/${imageName}`;

    // ── Assemble full markdown with front matter ──
    const fullMarkdown = `---
published: false
layout: post
title: "${post.title.replace(/"/g, '\\"')}"
date: ${dateStr}
categories: [${post.category}]
image: ${body.imageBase64 ? imagePath : "/assets/images/blog/blog-default.jpg"}
description: "${post.description.replace(/"/g, '\\"')}"
excerpt: "${post.excerpt.replace(/"/g, '\\"')}"
---

${post.body}`;

    // ── Get master HEAD ──
    const masterRef = await ghAPI("GET", "/git/ref/heads/master");
    const masterSHA = masterRef.object.sha;

    // ── Upload image blob (if provided) ──
    let imageBlob = null;
    if (body.imageBase64) {
      const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      imageBlob = await ghAPI("POST", "/git/blobs", {
        content: base64Data,
        encoding: "base64",
      });
    }

    // ── Upload markdown blob ──
    const mdBlob = await ghAPI("POST", "/git/blobs", {
      content: Buffer.from(fullMarkdown).toString("base64"),
      encoding: "base64",
    });

    // ── Get base tree ──
    const masterCommit = await ghAPI("GET", `/git/commits/${masterSHA}`);
    const baseTreeSHA = masterCommit.tree.sha;

    // ── Build new tree ──
    const postFilename = `${dateStr}-${post.slug}.md`;
    const treeItems = [
      {
        path: `_posts/${postFilename}`,
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

    // ── Create commit directly on master ──
    const newCommit = await ghAPI("POST", "/git/commits", {
      message: `blog: Add draft — ${post.title} [${post.category}]`,
      tree: newTree.sha,
      parents: [masterSHA],
      author: {
        name: "FCP Content Bot",
        email: "130697360+CoachD23@users.noreply.github.com",
        date: new Date().toISOString(),
      },
    });

    // ── Update master ref ──
    await ghAPI("PATCH", "/git/refs/heads/master", {
      sha: newCommit.sha,
    });

    return respond(200, {
      success: true,
      message: "Content saved as draft! Coach D will review and publish it in the CMS.",
      title: post.title,
      category: post.category,
      filename: postFilename,
    });
  } catch (err) {
    console.error("Submit content error:", err);
    return respond(500, {
      error: "Something went wrong. Please try again.",
      detail: typeof err === "object" ? JSON.stringify(err) : String(err),
    });
  }
};
