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

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // ── Title ──
  let verb;
  if (isWin) {
    if (margin >= 20) verb = pick(["Dominate", "Dismantle", "Blow Past"]);
    else if (margin >= 10) verb = pick(["Roll Past", "Cruise Past", "Power Past"]);
    else if (margin >= 5) verb = pick(["Down", "Outlast", "Defeat"]);
    else verb = pick(["Edge", "Survive", "Hold Off"]);
  } else {
    if (margin >= 20) verb = pick(["Fall to", "Stumble Against"]);
    else if (margin >= 10) verb = pick(["Lose to", "Drop One to"]);
    else verb = pick(["Fall Short Against", "Come Up Short Against"]);
  }
  const sigTag = significance !== "Regular Season" ? ` ${significance}` : "";
  const result = isWin ? "Win" : "Loss";
  const title = `Spartans ${verb} ${opponent} ${fcpScore}-${oppScore} in${sigTag} ${result}`;
  const slug = `game-recap-vs-${slugify(opponent)}`;

  // ── SEO Description & Excerpt ──
  const description = `Game recap: FCP Spartans ${isWin ? "defeat" : "fall to"} ${opponent} ${fcpScore}-${oppScore}${significance !== "Regular Season" ? ` in ${significance.toLowerCase()} action` : ""}${location === "Home" ? " at home" : " on the road"}.`;

  let excerpt;
  const sigPhrase = significance !== "Regular Season" ? ` in ${significance.toLowerCase()} play` : "";
  if (isWin) {
    if (margin >= 15) excerpt = `The Spartans delivered a statement victory over ${opponent}, winning ${fcpScore}-${oppScore}${sigPhrase} in a dominant showing from start to finish.`;
    else if (margin >= 5) excerpt = `A balanced attack carried the Spartans past ${opponent} ${fcpScore}-${oppScore}${sigPhrase} as FCP continued to build momentum.`;
    else excerpt = `The Spartans gutted out a ${fcpScore}-${oppScore} victory over ${opponent}${sigPhrase} in a thriller that went down to the final minutes.`;
  } else {
    if (margin <= 5) excerpt = `The Spartans battled ${opponent} to the wire but fell ${fcpScore}-${oppScore}${sigPhrase} in a game that showcased FCP's competitive grit.`;
    else excerpt = `A tough outing against ${opponent} ended ${fcpScore}-${oppScore}${sigPhrase}, but the Spartans showed fight throughout.`;
  }

  // ── Narrative Body ──
  let md = "";
  const isHome = location === "Home";
  const venue = venueName || (isHome ? "their home floor" : `${opponent}'s gym`);
  const sigLabel = significance !== "Regular Season" ? significance.toLowerCase() : "";

  // PARAGRAPH 1: Scene-setting lede
  if (isWin) {
    if (margin >= 20) {
      md += pick([
        `From the opening tip, this one was never in doubt. The FCP Spartans took the floor ${isHome ? `at ${venue}` : `on the road at ${venue}`} and delivered a masterclass${sigLabel ? ` in ${sigLabel} action` : ""}, dismantling ${opponent} **${fcpScore}-${oppScore}** in a performance that sent a clear message to the rest of the field.\n\n`,
        `The Spartans came out with a point to prove ${isHome ? `in front of the home crowd at ${venue}` : `at ${venue}`}, and ${opponent} had no answer. FCP rolled to a commanding **${fcpScore}-${oppScore}** victory${sigLabel ? ` in ${sigLabel} play` : ""}, controlling the tempo from start to finish and never looking back.\n\n`,
        `This is what happens when the Spartans bring that level of intensity. FCP ${isHome ? `welcomed ${opponent} to ${venue}` : `traveled to ${venue}`} and put on a show${sigLabel ? ` in ${sigLabel} action` : ""}, cruising to a **${fcpScore}-${oppScore}** blowout that was over well before the final buzzer.\n\n`,
      ]);
    } else if (margin >= 10) {
      md += pick([
        `The FCP Spartans kept rolling ${isHome ? `at ${venue}` : `on the road at ${venue}`}, putting together a complete effort to knock off ${opponent} **${fcpScore}-${oppScore}**${sigLabel ? ` in ${sigLabel} play` : ""}. It was the kind of balanced performance that's becoming a trademark of this squad.\n\n`,
        `Another night, another Spartan W. FCP ${isHome ? `took care of business at ${venue}` : `handled business at ${venue}`}, pulling away from ${opponent} for a convincing **${fcpScore}-${oppScore}** victory${sigLabel ? ` in ${sigLabel} action` : ""} that showcased the program's depth and discipline.\n\n`,
      ]);
    } else if (margin >= 5) {
      md += pick([
        `The Spartans had to earn this one. FCP ${isHome ? `hosted ${opponent} at ${venue}` : `traveled to ${venue} to face ${opponent}`} and pulled away late for a **${fcpScore}-${oppScore}** win${sigLabel ? ` in ${sigLabel} play` : ""}, using a pivotal stretch to create separation and close it out.\n\n`,
        `It wasn't always pretty, but the Spartans found a way. FCP gutted out a **${fcpScore}-${oppScore}** victory over ${opponent} ${isHome ? `at ${venue}` : `on the road at ${venue}`}${sigLabel ? ` in ${sigLabel} action` : ""}, leaning on timely plays and tough defense to seal the deal.\n\n`,
      ]);
    } else {
      md += pick([
        `This was a battle from wire to wire. The FCP Spartans ${isHome ? `held off ${opponent} at ${venue}` : `survived a dogfight at ${venue}`} for a **${fcpScore}-${oppScore}** victory${sigLabel ? ` in ${sigLabel} play` : ""} — the kind of game that forges championship character. Neither team backed down, but FCP made the plays that mattered when it counted most.\n\n`,
        `If you left early, you missed a classic. The Spartans and ${opponent} went back and forth ${isHome ? `at ${venue}` : `at ${venue}`}${sigLabel ? ` in ${sigLabel} action` : ""}, with FCP ultimately hanging on for a **${fcpScore}-${oppScore}** win that tested every ounce of their resolve.\n\n`,
      ]);
    }
  } else {
    if (margin <= 5) {
      md += pick([
        `Sometimes the ball just doesn't bounce your way. The FCP Spartans ${isHome ? `battled ${opponent} at ${venue}` : `went toe-to-toe with ${opponent} at ${venue}`} in a tightly contested affair${sigLabel ? ` in ${sigLabel} play` : ""}, ultimately falling **${fcpScore}-${oppScore}** in a game that was decided in the final possessions.\n\n`,
        `This one stings. The Spartans ${isHome ? `fought ${opponent} down to the wire at ${venue}` : `took the fight to ${opponent} at ${venue}`}${sigLabel ? ` in ${sigLabel} action` : ""} but came up just short, dropping a **${fcpScore}-${oppScore}** heartbreaker that could have gone either way.\n\n`,
      ]);
    } else {
      md += pick([
        `It was a tough night at the office for the Spartans. FCP ${isHome ? `hosted ${opponent} at ${venue}` : `traveled to ${venue} to face ${opponent}`}${sigLabel ? ` in ${sigLabel} action` : ""} and couldn't find their rhythm, falling **${fcpScore}-${oppScore}** in a contest where ${opponent} controlled the pace from the jump.\n\n`,
        `The Spartans ran into a buzzsaw. ${opponent} came out firing ${isHome ? `at ${venue}` : `at ${venue}`}${sigLabel ? ` in ${sigLabel} play` : ""}, and FCP couldn't climb back from an early deficit in a **${fcpScore}-${oppScore}** loss that left the coaching staff looking for answers.\n\n`,
      ]);
    }
  }

  if (team) md += `**Team:** ${team}\n\n`;

  // PARAGRAPH 2: Player narratives (woven in, not just a dry table)
  if (players.length > 0) {
    md += `## Key Performances\n\n`;
    const leadPlayer = players[0];
    const leadVerbs = ["led the charge", "set the tone", "carried the load", "paced the Spartans", "was the catalyst"];
    const supportVerbs = ["chipped in", "provided a spark", "made his presence felt", "stepped up with", "added a strong showing with"];

    md += `**${leadPlayer.name}** ${pick(leadVerbs)} for FCP, finishing with **${leadPlayer.stats}**`;
    if (isWin && margin < 5) md += ` — including clutch contributions down the stretch.\n\n`;
    else if (isWin && margin >= 15) md += ` in a performance that had the sideline buzzing.\n\n`;
    else md += ` on the night.\n\n`;

    if (players.length > 1) {
      const others = players.slice(1);
      if (others.length === 1) {
        md += `**${others[0].name}** ${pick(supportVerbs)} **${others[0].stats}**, adding another dimension to the Spartans' attack.\n\n`;
      } else {
        md += `The supporting cast showed up in a big way. `;
        others.forEach((p, i) => {
          if (i === others.length - 1) md += `and **${p.name}** finished with **${p.stats}**.\n\n`;
          else md += `**${p.name}** contributed **${p.stats}**, `;
        });
      }
    }
  }

  // PARAGRAPH 3: Game highlights / story beats
  if (highlights.trim()) {
    md += `## How It Happened\n\n`;
    md += `${highlights.trim()}\n\n`;
  }

  // PARAGRAPH 4: Coach quote — dramatic framing
  if (coachQuote.trim()) {
    const quoteFrames = [
      `After the final buzzer, the message from the FCP coaching staff was clear:\n\n`,
      `The coaching staff ${isWin ? "liked what they saw" : "kept things in perspective"} afterward:\n\n`,
      `Here's what the FCP coaching staff had to say:\n\n`,
    ];
    md += pick(quoteFrames);
    md += `> "${coachQuote.trim()}"\n> — FCP Coaching Staff\n\n`;
  }

  // PARAGRAPH 5: Forward-looking close
  if (isWin) {
    md += pick([
      `The win adds another chapter to what's shaping up to be a strong season for the Spartans. FCP continues to prove that their blend of talent development and competitive intensity can match up with anyone on the schedule.\n\n`,
      `With the victory, the Spartans continue to build momentum heading into the next stretch of the season. This program is trending in the right direction — and nights like these are why.\n\n`,
      `Another win in the books, and the Spartans aren't slowing down. The combination of veteran leadership and young talent is starting to click at just the right time for FCP.\n\n`,
    ]);
  } else {
    md += pick([
      `Despite the result, there were plenty of positives for the Spartans to build on. FCP's coaching staff has preached development all season, and this group has shown it can compete with anyone. Look for them to bounce back in a big way.\n\n`,
      `The loss is a tough pill to swallow, but this Spartan squad has shown resilience all season. The coaching staff will use this one as fuel — expect FCP to come out with a chip on their shoulder next time out.\n\n`,
    ]);
  }

  md += `Interested in competing at this level? Learn more about the [Post-Grad Basketball Program](/post-grad/) at Florida Coastal Prep and see how we develop student-athletes for the next level.\n\n`;
  md += buildFooter("game-recap");

  return { title, slug, description, excerpt, body: md, category: "game-recap" };
}

// ── 2. Daily Life ─────────────────────────────────────────────────
function generateDailyLife(body) {
  const customTitle = body.title || "A Day at FCP";
  const caption = body.caption || "";
  const slug = `daily-life-${slugify(customTitle)}`;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const title = customTitle;
  const description = `Life at Florida Coastal Prep: ${customTitle.toLowerCase()}. Go behind the scenes and see what it's really like to be an FCP Spartan.`;
  const excerpt = caption
    ? caption.substring(0, 140).trim() + " — This is what the FCP experience is all about."
    : `A behind-the-scenes look at daily life at Florida Coastal Prep — ${customTitle.toLowerCase()}.`;

  let md = "";

  // Opening — warm, immersive scene-setter
  md += pick([
    `You can talk about the wins, the workouts, and the college commitments — but ask any Spartan what makes FCP special, and they'll tell you it's moments like this.\n\n`,
    `This is the stuff that doesn't always make the highlight reel, but it's what makes Florida Coastal Prep feel like home.\n\n`,
    `Being a Spartan isn't just about what happens between the lines. It's about the moments in between — the ones that turn teammates into brothers and a program into a family.\n\n`,
    `There's a rhythm to life at FCP that you can't fully understand until you're here. It's the energy in the hallways, the laughter at the lunch table, the feeling that you're part of something bigger.\n\n`,
  ]);

  // Caption content — expanded into a narrative moment
  if (caption.trim()) {
    md += `${caption.trim()}\n\n`;
    md += pick([
      `It's these everyday moments that define the Spartan experience. When these guys look back years from now, this is what they'll remember — not just the box scores, but the bonds they built along the way.\n\n`,
      `Scenes like this are exactly why student-athletes from across the country choose FCP. The basketball development is elite, but the brotherhood? That's what keeps them coming back every single day.\n\n`,
      `At Florida Coastal Prep, we believe that developing the whole person — not just the player — is what separates good programs from great ones. Moments like this are proof that the culture here is real.\n\n`,
    ]);
  } else {
    md += pick([
      `Another day, another chapter in the Spartan story. Whether it's team meals, campus hangouts, or just the daily grind of student-athlete life, the FCP experience is about building something that lasts long after the final buzzer.\n\n`,
      `The cameras don't always catch these moments, but they're the heartbeat of the program. From morning workouts to evening study sessions, every day at FCP is a chance to grow — on and off the court.\n\n`,
    ]);
  }

  // Closing — invitation to learn more
  md += pick([
    `Want to see what the Spartan lifestyle is really like? Learn more about [housing and campus life at FCP](/housing/) and discover why our student-athletes call this place home.\n\n`,
    `Curious about life at FCP? Explore our [housing and campus experience](/housing/) to see what a day in the life of a Spartan looks like — from the beach to the gym and everything in between.\n\n`,
    `This is the FCP difference. Check out our [housing and campus life](/housing/) to see how we create an environment where student-athletes thrive.\n\n`,
  ]);

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
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const title = `${playerName} Commits to ${school}`;
  const slug = `commitment-${slugify(playerName)}-${slugify(school)}`;
  const description = `COMMITTED: FCP Spartan ${playerName} has officially committed to ${school}. Another Florida Coastal Prep athlete earns a spot at the next level.`;
  const excerpt = `The journey has paid off. ${playerName} has officially committed to ${school}, becoming the latest FCP Spartan to punch their ticket to the next level.`;

  let md = "";

  // Opening — ESPN commitment announcement style
  md += pick([
    `**It's official.** ${playerName} — the ${position ? position.toLowerCase() + " " : ""}${hometown ? `out of ${hometown} ` : ""}who put in the work day after day at Florida Coastal Prep — has committed to **${school}**.\n\n`,
    `Another Spartan is moving on up. **${playerName}** has officially committed to **${school}**, capping off a journey at Florida Coastal Prep that exemplifies everything this program stands for.\n\n`,
    `The next chapter is written. **${playerName}** announced ${pick(["today", "this week"])} that ${pick(["he has", "he's"])} committed to **${school}** — a moment that's been building since ${pick(["the first day he stepped on campus at FCP", "he first walked through the doors at Florida Coastal Prep"])}.\n\n`,
  ]);

  // Player profile card
  if (position || height || hometown) {
    md += `### Player Profile\n\n`;
    const details = [];
    if (position) details.push(`**Position:** ${position}`);
    if (height) details.push(`**Height:** ${height}`);
    if (hometown) details.push(`**Hometown:** ${hometown}`);
    details.push(`**Committed to:** ${school}`);
    md += details.join(" | ") + "\n\n";
  }

  // Journey narrative
  if (description_text.trim()) {
    md += `${description_text.trim()}\n\n`;
  } else {
    md += pick([
      `${playerName}'s time at FCP was defined by the kind of relentless work ethic that college coaches look for. From early-morning workouts in the [Spartan Training Center](/training/) to late-night film sessions, ${playerName} earned every bit of this opportunity. The growth — both on the court and in the classroom — has been remarkable to watch.\n\n`,
      `When ${playerName} first arrived at Florida Coastal Prep, the goal was clear: develop into a college-ready player while competing against elite competition. Mission accomplished. Through months of skill development, high-level games, and the mentorship of the FCP coaching staff, ${playerName} transformed into the kind of player that programs like ${school} want on their roster.\n\n`,
      `This commitment didn't happen by accident. ${playerName} bought into the FCP process from day one — trusted the coaching staff, embraced the development program, and competed every single day. The result? A well-earned opportunity at ${school} that validates every early morning and every extra rep.\n\n`,
    ]);
  }

  // What this means for FCP
  md += pick([
    `For Florida Coastal Prep, this commitment is another reminder of what's possible when talent meets opportunity. The FCP pipeline continues to deliver — placing student-athletes at programs where they can compete and succeed at the next level.\n\n`,
    `This is the FCP blueprint in action: bring in talented, driven student-athletes, surround them with elite coaching and development, and watch them earn opportunities they've been working toward their entire lives. ${playerName}'s story is proof that the system works.\n\n`,
  ]);

  // Coach quote
  if (coachQuote.trim()) {
    md += pick([
      `The FCP coaching staff couldn't be prouder:\n\n`,
      `From the Spartan sideline:\n\n`,
      `The coaching staff summed it up best:\n\n`,
    ]);
    md += `> "${coachQuote.trim()}"\n> — FCP Coaching Staff\n\n`;
  }

  // CTA close
  md += `**Interested in following this path?** Learn more about the [Post-Grad Basketball Program](/post-grad/) at Florida Coastal Prep and discover how we prepare student-athletes for college basketball and beyond.\n\n`;
  md += buildFooter("commitments");

  return { title, slug, description, excerpt, body: md, category: "commitments" };
}

// ── 4. Training ───────────────────────────────────────────────────
function generateTraining(body) {
  const customTitle = body.title || "Training Session at the Spartan Center";
  const drillFocus = body.focus || "";
  const description_text = body.description || "";
  const playersInvolved = body.playersInvolved || "";
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const title = customTitle;
  const slug = `training-${slugify(customTitle)}`;
  const description = `Inside the Spartan Training Center: ${customTitle.toLowerCase()}. An inside look at how FCP develops next-level basketball talent.`;
  const excerpt = description_text
    ? description_text.substring(0, 130).trim() + " — Inside the Spartan Training Center."
    : `Inside look at today's training session at the Spartan Training Center — where the next level starts.`;

  let md = "";

  // Opening — immersive gym scene
  md += pick([
    `The sneakers squeak, the whistles blow, and the work never stops. Inside the [Spartan Training Center](/training/), another day of development is underway — and the intensity level is exactly where the coaching staff wants it.\n\n`,
    `Walk into the Spartan Training Center on any given day and you'll see the same thing: players pushing themselves to the limit, coaches demanding more, and a standard of excellence that permeates every drill. Today was no different.\n\n`,
    `This is where it happens. Not under the lights on game night, but here — in the [Spartan Training Center](/training/), where reps become habits and habits become game-changers. The Spartans were back at it today, and the work was as real as it gets.\n\n`,
    `The scoreboard might be off, but the competition is very much on. The Spartans brought the energy to the [Spartan Training Center](/training/) today, attacking every drill with the kind of urgency that separates programs.\n\n`,
  ]);

  // Focus area — framed as coaching insight
  if (drillFocus) {
    md += pick([
      `**Today's Focus: ${drillFocus}**\n\nThe coaching staff zeroed in on ${drillFocus.toLowerCase()} during today's session — a deliberate emphasis that speaks to where this team is in its development. Every drill was designed to reinforce the habits that translate directly to game situations.\n\n`,
      `**Session Focus: ${drillFocus}**\n\nToday's work centered around ${drillFocus.toLowerCase()}, with the coaching staff building progressions that challenged players to think faster, move quicker, and execute under pressure. It's the kind of detail-oriented training that gives FCP athletes an edge.\n\n`,
    ]);
  }

  // Description — expanded if provided, rich default if not
  if (description_text.trim()) {
    md += `${description_text.trim()}\n\n`;
    md += pick([
      `Sessions like this are the backbone of the FCP development model. The results don't always show up overnight, but the daily investment compounds — and when game time rolls around, the preparation speaks for itself.\n\n`,
      `It's this kind of purposeful training that separates FCP from other programs. Every session is mapped out with intention, building toward measurable growth that shows up when it matters most.\n\n`,
    ]);
  } else {
    md += pick([
      `The Spartans went through a high-tempo session that challenged both their physical conditioning and basketball IQ. The coaching staff kept the pace intense, rotating through competitive drills that demanded full effort on every rep. No shortcuts, no easy possessions — just the kind of relentless preparation that builds college-ready players.\n\n`,
      `From individual skill work to full-court competitive sets, the Spartans ran through a complete session that tested every aspect of their game. The energy was infectious, with players pushing each other and the coaching staff raising the bar at every turn.\n\n`,
    ]);
  }

  // Players featured — woven into narrative
  if (playersInvolved.trim()) {
    md += pick([
      `**Standing out today:** ${playersInvolved.trim()} — each bringing the kind of effort and focus that catches the coaching staff's attention.\n\n`,
      `**Notable performers:** ${playersInvolved.trim()} were among those who stood out during today's session, showing the growth and competitive fire that define the Spartan mentality.\n\n`,
    ]);
  }

  // Closing — program pitch
  md += pick([
    `This is the FCP advantage. A professional-grade training environment, expert coaching, and a culture that demands excellence every single day. It's why student-athletes from across the country choose to develop here.\n\n`,
    `Day by day, rep by rep — this is how the Spartans are built. The [Spartan Training Center](/training/) isn't just a gym; it's a development lab where the next generation of college basketball players is being forged.\n\n`,
  ]);

  md += `**Ready to train like a Spartan?** Learn more about our [training facilities and philosophy](/training/) and see what makes FCP's development program elite.\n\n`;
  md += buildFooter("training");

  return { title, slug, description, excerpt, body: md, category: "training" };
}

// ── 5. Program News ───────────────────────────────────────────────
function generateProgramNews(body) {
  const customTitle = body.title || "FCP Program Update";
  const description_text = body.description || "";
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const title = customTitle;
  const slug = `news-${slugify(customTitle)}`;
  const description = `Florida Coastal Prep news: ${customTitle}. The latest from one of Florida's premier post-grad basketball programs.`;
  const excerpt = description_text
    ? description_text.substring(0, 130).trim() + " — Latest from FCP."
    : `Breaking news from the Florida Coastal Prep basketball program — ${customTitle.toLowerCase()}.`;

  let md = "";

  // Opening — authoritative news framing
  md += pick([
    `Florida Coastal Prep continues to raise the bar. Here's the latest from one of the premier post-grad basketball programs in the state of Florida.\n\n`,
    `Big things are happening at Florida Coastal Prep, and this is one you'll want to know about.\n\n`,
    `The Spartan program keeps moving forward. Here's the latest development out of Florida Coastal Prep.\n\n`,
    `When you're building something special, the updates keep coming. Here's what's new at FCP.\n\n`,
  ]);

  // Main content
  if (description_text.trim()) {
    md += `${description_text.trim()}\n\n`;
    md += pick([
      `This is another step in FCP's ongoing mission to provide student-athletes with the tools, mentorship, and competitive environment they need to reach the next level. Under the leadership of the coaching staff, the program continues to evolve and grow — on the court and off it.\n\n`,
      `Developments like this reflect the program's commitment to excellence in everything they do. From top-tier basketball development to academics and life skills, Florida Coastal Prep is setting a standard that others are taking notice of.\n\n`,
      `For a program that prides itself on doing things the right way, this announcement fits right in. FCP has built its reputation on developing the whole student-athlete, and every move the program makes reinforces that commitment.\n\n`,
    ]);
  } else {
    md += pick([
      `Details are still developing, but one thing is clear: Florida Coastal Prep is positioning itself for an exciting stretch ahead. The program's combination of elite basketball development, strong academics, and a proven track record of college placements continues to attract attention from players and families nationwide.\n\n`,
      `Stay tuned for more details on this developing story. What we can tell you is this: the FCP coaching staff has been working behind the scenes to ensure the program continues delivering the kind of experience that changes young men's lives — and the results speak for themselves.\n\n`,
    ]);
  }

  // Closing — brand reinforcement
  md += pick([
    `Want to learn more about what makes FCP different? Explore our [program overview](/about/) to see how Florida Coastal Prep is redefining post-grad basketball development in the Sunshine State.\n\n`,
    `There's a reason FCP is one of the most talked-about programs in Florida. Learn more [about us](/about/) and see why families across the country are choosing the Spartan way.\n\n`,
  ]);

  md += buildFooter("program-news");

  return { title, slug, description, excerpt, body: md, category: "program-news" };
}

// ── 6. Alumni Update ──────────────────────────────────────────────
function generateAlumniUpdate(body) {
  const playerName = body.playerName || "FCP Alumni";
  const currentTeam = body.currentTeam || "";
  const description_text = body.update || "";
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const title = currentTeam
    ? `Where Are They Now: ${playerName} at ${currentTeam}`
    : `Where Are They Now: ${playerName}`;
  const slug = `alumni-${slugify(playerName)}`;
  const description = `FCP Alumni Spotlight: ${playerName}${currentTeam ? ` is now at ${currentTeam}` : ""}. Follow the journey of a former Spartan thriving at the next level.`;
  const excerpt = `Once a Spartan, always a Spartan. ${playerName}${currentTeam ? ` is making waves at ${currentTeam}` : " continues to thrive after FCP"} — here's the latest on their journey.`;

  let md = "";

  // Opening — "Where Are They Now" feature style
  if (currentTeam) {
    md += pick([
      `The best programs don't just develop players for the next level — they produce players who thrive when they get there. **${playerName}**, now ${pick(["competing with", "suiting up for", "representing"])} **${currentTeam}**, is proving that the Spartan way translates.\n\n`,
      `When **${playerName}** left Florida Coastal Prep, the coaching staff knew it was only a matter of time before the basketball world took notice. Now at **${currentTeam}**, that confidence is being rewarded.\n\n`,
      `Another FCP success story is writing its next chapter. **${playerName}** has landed at **${currentTeam}**, and the early returns suggest the best is yet to come for this former Spartan.\n\n`,
    ]);
  } else {
    md += pick([
      `Once a Spartan, always a Spartan. **${playerName}** may have moved on from Florida Coastal Prep, but the foundation built here continues to pay dividends.\n\n`,
      `The FCP alumni network keeps growing, and **${playerName}** is one of the names carrying the Spartan torch forward.\n\n`,
    ]);
  }

  // Current team callout
  if (currentTeam) {
    md += `**Current Program:** ${currentTeam}\n\n`;
  }

  // Update content — expanded if provided, rich default if not
  if (description_text.trim()) {
    md += `${description_text.trim()}\n\n`;
    md += pick([
      `It's stories like these that remind the FCP coaching staff why they do what they do. Every early morning workout, every film session, every tough conversation — it all leads to moments like this. Seeing former Spartans succeed at the next level is the ultimate validation of the program's approach.\n\n`,
      `For the current Spartans watching from campus, ${playerName}'s journey is a roadmap. The path from FCP to the next level is real, it's proven, and it's waiting for anyone willing to put in the work.\n\n`,
      `${playerName}'s continued success is a testament to the development-first culture at Florida Coastal Prep. The skills, habits, and mentality built during their time as a Spartan are clearly paying off at the highest levels.\n\n`,
    ]);
  } else {
    md += pick([
      `${playerName} continues to represent the Spartan family with the same energy, work ethic, and competitive fire that defined their time at FCP. The coaching staff stays in close contact with alumni, and the reports on ${playerName}'s progress have been nothing short of impressive.\n\nIt's exactly what the program was designed to produce — not just college-ready players, but college-successful ones. The FCP experience doesn't just open doors; it prepares you to walk through them.\n\n`,
      `The transition from FCP to the next level isn't always easy, but ${playerName} has handled it like a true Spartan — with poise, determination, and the kind of preparation that only comes from a program built on daily development. The coaching staff continues to check in regularly, and the word is clear: ${playerName} is making FCP proud.\n\n`,
    ]);
  }

  // Closing — program reinforcement
  md += pick([
    `Florida Coastal Prep's alumni network spans programs across the country, and every success story strengthens the pipeline for current and future Spartans. Want to be next? Learn more [about FCP](/about/) and see how we prepare student-athletes for success at every level.\n\n`,
    `Every Spartan who succeeds at the next level raises the bar for those who follow. ${playerName}'s journey is proof that the FCP model works — and the best part is, this story is still being written. Learn more [about our program](/about/) and the Spartan alumni network.\n\n`,
  ]);

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
