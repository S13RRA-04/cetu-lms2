'use strict';
/**
 * Seed the Day 1, 1445 "Process & Cooperation Mapping Workshop" — a squad
 * exercise following Lecture 2 (Legal Framework for Cyber Investigations)
 * that has students map the real, public-record FBI Hive ransomware
 * disruption (Jan 26, 2023) to the SCA tiers, Rule 41, the four
 * international-cooperation mechanisms, and the agent/analyst/foreign-partner
 * triad taught in lecture.
 *
 * Not part of the packet-heist/packet-heist-v2 scenario (no drop_number /
 * scenario_name) — it sits alongside the other Day 1 lecture-block content
 * ("Day 1 Lecture 1", "Day 1 Lecture 2", "Day 1 Capstone"), gated purely by
 * is_published + per-squad AssignmentUnlock like those, not by the campaign
 * release engine.
 *
 * v2: replaces the first pass with the facilitator's more guided version —
 * each step now asks named sub-questions (Q2a/Q2b/Q3/Q4a/Q4b/Q5/Q6/Q7) plus
 * its own separate triad-role prompt, graded against the facilitator guide's
 * verbatim "A complete squad answer must" lists (not the model answer's exact
 * wording — the guide is explicit that the model answer is a reference for
 * what a complete response looks like, not the only acceptable phrasing).
 * Safe to rerun: deletes and reseeds by title, but only after confirming
 * live that the prior row is unpublished with zero submissions/grades/unlocks.
 *
 * Run: node backend/scripts/seed-pact-day1-hive-workshop.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const TITLE = 'Day 1 Workshop — Process & Cooperation Mapping (The Hive Ransomware Disruption)';

const CASE_NARRATIVE = `Below is the public record of a real, multinational ransomware disruption: the FBI's takedown of the Hive ransomware operation, announced January 26, 2023. Work through it as a squad, step by step. Each step asks you to draft something specific together — name the exact legal authority, not just "some kind of process," and write the actual sentence or line of reasoning you'd put in front of an AUSA or a magistrate. Talk it out before anyone writes; this is squad work, and the answers should reflect the squad's reasoning, not one person's guess.

A note on certainty: real cases aren't published with a stated the-agent-used-exactly-this-instrument breakdown — that detail is usually sealed. Some steps have one clearly best-supported answer; at least one does not, and saying so specifically, with reasoning, is a legitimate answer when the case actually shows that. A confident wrong guess is worse than a well-argued "we don't think this fits cleanly, and here's why."

STEP 1 (background)
From mid-2021 onward, an actor group operating under the name "Hive" ran a ransomware-as-a-service scheme. Per the DOJ's January 26, 2023 press release, Hive "has victimized over 1,500 companies in over 80 countries around the world, and received over $100 million in ransom payments." Affiliates carried out intrusions and encryption; the core group provided the ransomware, leak-site infrastructure, and negotiation portal, taking a 20% share of each ransom paid.

STEP 2
Beginning in July 2022, the FBI gained access to Hive's back-end computer network — specifically, per the unsealed warrant affidavit, "two dedicated servers and one virtual private server" at a hosting provider in California. Those servers "had been leased using email addresses belonging to Hive members." The FBI covertly monitored the group's operations through this access for roughly six months.

STEP 3
During the monitoring period, the FBI captured Hive's decryption keys and distributed more than 300 of them to victims actively under attack, plus over 1,000 more to earlier victims. Deputy Attorney General Lisa Monaco: "Using lawful means we hacked the hackers." Publicly reported examples include a disrupted attack on a Louisiana hospital (avoiding a $3 million ransom) and a Texas school district.

STEP 4
The investigation traced Hive's back-end infrastructure to two servers physically located at a hosting provider in Los Angeles. Attorney General Merrick Garland, at the January 26, 2023 press conference: "Last night, pursuant to a court order, we seized those servers. We also received court authorization to wrest control of Hive's dark net sites and render its services unavailable."

STEP 5
In a coordinated action, the Netherlands' National High Tech Crime Unit gained access to two backup servers hosted in the Netherlands that mirrored Hive's main leak site and negotiation site. Germany's Federal Criminal Police (BKA) and the Reutlingen Police Headquarters also participated. Europol stated it "provided coordination support," including deployed experts and operational meetings hosted in Portugal and the Netherlands.

STEP 6
The U.S., German, and Dutch actions were executed in a coordinated, near-simultaneous window on the night of January 25–26, 2023. Hive's dark web leak site was replaced with a seizure notice reading, in part: "This action has been taken in coordination with the United States Attorney's Office for the Middle District of Florida and the Computer Crime and Intellectual Property Section of the Department of Justice with substantial assistance from Europol."

STEP 7
No arrests were announced at the time of the disruption. FBI Director Christopher Wray: "We'll continue gathering evidence; building out our map of Hive developers, administrators and affiliates; and using that knowledge to drive arrests, seizures and other operations, whether by the FBI or our partners here and abroad."

Sources: U.S. Department of Justice press release, "U.S. Department of Justice Disrupts Hive Ransomware Variant" (Jan. 26, 2023); public reporting and direct quotations from Reuters, BleepingComputer, CyberScoop, Bank Info Security, TechCrunch, and the unsealed warrant affidavit as reported by NBC News and BleepingComputer. Every quotation above is thirty words or fewer and drawn from these public sources. Where the record does not specify the exact legal instrument used at a step, the model answer says so and gives the best-supported inference from the framework rather than presenting a guess as confirmed fact.`;

const DESCRIPTION = 'Squad exercise following today’s Legal Framework lecture. Work through the real, public record of the FBI’s Hive ransomware disruption as a squad, step by step. Each question asks you to draft something specific together — name the exact legal authority, not just “some kind of process,” and write the actual sentence or line of reasoning you’d put in front of an AUSA or a magistrate. Talk it out before anyone writes.';

// keyElements are the facilitator guide's verbatim "A complete squad answer
// must" bullets — the actual grading criteria. The model answer is folded in
// as an unscored reference note (via commonErrors, the only other rubric slot
// the grading UI renders) so instructors can see what a complete response
// looks like while grading, per the guide's own instruction not to grade
// against the model answer's exact wording.
function refNote(modelAnswer) {
  return [`MODEL ANSWER (reference only — grade against the must-include list, not exact wording): ${modelAnswer}`];
}

const PROMPTS = [
  {
    points: 8,
    text: `STEP 2 — Q2a: Identifying the lease\n\nThe servers were leased using specific email addresses belonging to Hive members. As a squad, draft the specific legal-process request you'd send to identify the subscriber behind those email accounts — name the exact tier and, if you can, the statutory cite, then write the one-sentence relevance statement your request would need to include.`,
    keyElements: [
      "Names the specific tier (Tier 1) and, ideally, cites 18 U.S.C. §2703(c)(2)",
      "States why Tier 1 doesn't require probable cause — only a relevant nexus — and writes a relevance sentence that would satisfy that standard",
    ],
    commonErrors: refNote(`"Tier 1 — subpoena under 18 U.S.C. §2703(c)(2). Relevance statement: these records will identify the account holder(s) who leased infrastructure used to operate and communicate with the Hive ransomware scheme under investigation."`),
  },
  {
    points: 12,
    text: `STEP 2 — Q2b: Accessing the network itself\n\nSeparate from identifying the lease, draft the specific authority you'd cite to support six months of covert access to Hive's own back-end network, where ownership and location were concealed — then write the "technological concealment" sentence Lecture Slide 14 says the application has to include.`,
    keyElements: [
      "Names Rule 41(b)(6) specifically, not just ‘a warrant’",
      "Explains why a standard premises warrant doesn't fit — there's no single physical place to search up front",
      "Drafts a concealment sentence describing how the infrastructure's ownership/location was hidden",
    ],
    commonErrors: refNote(`"Rule 41(b)(6). Technological concealment language: the media to be searched — Hive's back-end control infrastructure — was leased anonymously and operated using techniques that concealed the true identity and location of those controlling it."`),
  },
  {
    points: 5,
    text: `STEP 2 — Triad role\n\nWhich role(s) in the agent / analyst / foreign-partner triad carried this step, and what specifically did each contribute?`,
    keyElements: [
      "Identifies Agent as drafting the Rule 41(b)(6) application",
      "Identifies Analyst as supplying the technical basis — how the infrastructure was identified, why its location is concealed, what the access technique will do — that the application has to describe in detail",
    ],
    commonErrors: refNote(`Agent drafts the Rule 41(b)(6) application; Analyst supplies the technical basis — how the infrastructure was identified, why its location is concealed, what the access technique will do — that the application has to describe in detail.`),
  },
  {
    points: 8,
    text: `STEP 3 — Q3: Staying inside the authority\n\nDistributing decryption keys to victims during an active covert-access operation is an action, not just collection. As a squad, draft the specific question the case agent should be putting to the AUSA at regular intervals throughout this six-month period — and explain in your own words why it has to be asked repeatedly, not just once at the start.`,
    keyElements: [
      "The drafted question specifically asks whether current activity still falls within what the original application described",
      "The explanation recognizes the operation's actual conduct evolved over six months (passive monitoring → active victim assistance) in a way a one-time check wouldn't catch",
    ],
    commonErrors: refNote(`"Does what we're currently doing with this access still fall within what our warrant application described?" It has to be asked repeatedly because the operation's real activity can drift from the affidavit's original description as the case develops — monitoring today doesn't guarantee tomorrow's use stays inside the same authorized scope.`),
  },
  {
    points: 5,
    text: `STEP 3 — Triad role\n\nWhich role(s) carried this step?`,
    keyElements: [
      "Identifies Analyst as continuing to produce the technical basis that justifies continued operation",
      "Identifies Agent as responsible for checking that back against the AUSA as the operation's scope evolves",
    ],
    commonErrors: refNote(`Analyst keeps producing the technical basis that justifies continued operation; Agent is responsible for checking that back against the AUSA as the operation's scope evolves.`),
  },
  {
    points: 6,
    text: `STEP 4 — Q4a: Finding out who controlled the LA account\n\nBefore seizing the servers, investigators needed to confirm the LA hosting account's subscriber details. Name the specific tier and draft the one-line basis for the request.`,
    keyElements: [
      "Names Tier 1 (subpoena) specifically",
      "Draft basis is a subscriber-information request, not a content request",
    ],
    commonErrors: refNote(`Tier 1 — subpoena. "Request for the name, address, and payment information of the subscriber(s) associated with the account leasing servers at [provider], relevant to an ongoing criminal investigation."`),
  },
  {
    points: 8,
    text: `STEP 4 — Q4b: Taking the servers\n\nGarland says "pursuant to a court order, we seized those servers." Name the specific authority that supports physically taking possession of servers and their content, and explain why Tier 1 or Tier 2 process alone would not have been enough here.`,
    keyElements: [
      "Names a Rule 41 search/seizure warrant specifically",
      "States, in the squad's own words, that content always requires a warrant — no tier below it reaches content",
    ],
    commonErrors: refNote(`A Rule 41 search and seizure warrant. Content always requires a warrant — there is no shortcut. Seizing the servers means seizing their content (communications, victim data, malware), which places this squarely at Tier 3, not Tier 1 or 2.`),
  },
  {
    points: 5,
    text: `STEP 4 — Triad role\n\nWhich role(s) carried this step?`,
    keyElements: [
      "Identifies Agent as drafting and executing the warrant",
      "Identifies Analyst as establishing, in the supporting affidavit, why these two specific servers matter to the investigation",
    ],
    commonErrors: refNote(`Agent drafts and executes the warrant; Analyst establishes, in the supporting affidavit, why these two specific servers matter to the investigation.`),
  },
  {
    points: 15,
    text: `STEP 5 — Q5: Naming the mechanism (this is the hardest one)\n\nAs a squad, decide: does this fit one of the four international-cooperation mechanisms from Lecture Slide 17 (direct provider cooperation, Budapest Convention Article 29 preservation, MLAT, 24/7 Network)? If yes, name which one and defend it using the specific facts above. If none fit cleanly, say so specifically — name which named agencies (BKA, Reutlingen Police, Netherlands NHTCU, Europol) did what, and describe, in your own words, what kind of cooperation this actually looks like.`,
    keyElements: [
      "Explicitly tests MLAT against the facts and explains why it doesn't fit (MLAT is the U.S. formally requesting a foreign government act; here, Dutch and German police acted under their own domestic authority against servers already in their own countries)",
      "Explicitly tests Article 29 preservation and explains why it doesn't fit (Article 29 freezes data pending a later MLAT; this was an executed access/seizure, not a preservation hold)",
      "Names the actual pattern in their own words: parallel domestic action by each country's own police, coordinated through direct agency relationships and Europol",
    ],
    commonErrors: refNote(`None of the four cleanly fits. This wasn't the U.S. requesting foreign action (not MLAT) and it wasn't a preservation hold pending a later request (not Article 29). Dutch and German police used their own domestic legal authority against servers already inside their own borders, timed and coordinated with the U.S. action through direct agency relationships and Europol. It's parallel domestic action, not an import of U.S. process abroad.`),
  },
  {
    points: 6,
    text: `STEP 5 — Triad role\n\nWhich role(s) carried this step?`,
    keyElements: [
      "Identifies the foreign partner as running their own domestic legal process, not merely supporting the U.S. agent's request",
    ],
    commonErrors: refNote(`Foreign partner — running their own domestic legal process, not merely supporting the U.S. agent's request (Lecture Slide 21's third triad role in action).`),
  },
  {
    points: 8,
    text: `STEP 6 — Q6: What timing depended on\n\nName the specific triad failure mode from Lecture Slide 22 that, if it had occurred here, would have wrecked this simultaneous three-country action. Then draft the one sentence a foreign-partner liaison would need to hear from the case agent — and state when they'd need to hear it — to prevent that failure mode.`,
    keyElements: [
      "Names the specific failure mode from Slide 22: foreign partner briefed late or partially",
      "The drafted sentence and timing show the briefing happening well before action night, not as a courtesy heads-up hours before",
    ],
    commonErrors: refNote(`Failure mode: 'foreign partner briefed late or partially → parallel process missed, or worse, runs at cross-purposes.' What they'd need to hear, well in advance of the operation: 'We're planning to execute on [date/window] — here's exactly what we need from your side and by when, so all three actions land together.'`),
  },
  {
    points: 5,
    text: `STEP 6 — Triad role\n\nWhich role(s) carried this step?`,
    keyElements: [
      "Identifies all three roles as synchronized — this step is about whether the triad's communication held under time pressure across three countries at once, not about any one role acting alone",
    ],
    commonErrors: refNote(`All three roles, synchronized — this step is about whether the triad's communication held under time pressure across three countries at once, not about any one role acting alone.`),
  },
  {
    points: 6,
    text: `STEP 7 — Q7: What's still open\n\nName the specific things Wray's quote tells you are still ongoing after this disruption, and identify which triad role owns each one.`,
    keyElements: [
      "Identifies at least two distinct ongoing threads (e.g., continued evidence-gathering, building the map of developers/administrators/affiliates, eventual arrests/seizures)",
      "Assigns each to a specific role rather than a generic 'the team continues working'",
    ],
    commonErrors: refNote(`Continued evidence-gathering and mapping developers/administrators/affiliates — Analyst-led, Agent-directed. Eventual arrests or further seizures, potentially by FBI or by partner countries — Agent and Foreign partner jointly, depending on where a given actor is located.`),
  },
  {
    points: 5,
    text: `STEP 7 — Triad role\n\nWhich role(s) carried this step?`,
    keyElements: [
      "Identifies Agent, Analyst, and Foreign partner as all ongoing — forward-looking discussion rather than a single answer",
    ],
    commonErrors: refNote(`Agent, Analyst, and Foreign partner, ongoing — forward-looking discussion rather than a single answer.`),
  },
  {
    points: 6,
    text: `SQUAD SYNTHESIS — Which step's answer are you least confident in, and what additional fact (not in this packet) would resolve it?`,
    keyElements: [
      "Names one specific step, not the workshop generally",
      "Identifies a concrete additional fact that would resolve the uncertainty, not a vague call for ‘more information’",
    ],
  },
  {
    points: 6,
    text: `SQUAD SYNTHESIS — Step 5 asked you to decide whether this fits one of the four named mechanisms. Whatever your squad concluded, state the strongest argument against your own answer — and why you still hold it (or don't).`,
    keyElements: [
      "States a genuine counter-argument to the squad's own Q5 answer, not a restatement of it",
      "Explains whether the squad still holds its position after considering that counter-argument, and why",
    ],
  },
  {
    points: 6,
    text: `SQUAD SYNTHESIS — This case ended in a disruption — seized infrastructure, distributed decryption keys — without announced arrests. What's still left to do, and for which role in the triad?`,
    keyElements: [
      "Identifies concrete remaining work (e.g., continued evidence-gathering, eventual arrests/seizures)",
      "Assigns it to a specific triad role rather than a generic 'the team continues working'",
    ],
  },
];

// The student-facing renderer (FormattedText) turns a **bold** run and a
// blank-line-separated paragraph into a visually distinct heading above the
// instructions/question body. Every prompt here is authored as "TITLE —
// rest", either already followed by \n\n (the 7 step questions) or as one
// run (the triad-role/synthesis questions) — this normalizes both into
// "**TITLE**\n\nbody" so every prompt gets the same bolded-heading treatment
// without hand-formatting each string above.
function formatPromptText(text) {
  const paraIdx = text.indexOf('\n\n');
  const dashIdx = text.indexOf(' — ');
  if (paraIdx !== -1 && (dashIdx === -1 || dashIdx < paraIdx)) {
    return `**${text.slice(0, paraIdx)}**${text.slice(paraIdx)}`;
  }
  if (dashIdx !== -1) {
    return `**${text.slice(0, dashIdx)}**\n\n${text.slice(dashIdx + 3)}`;
  }
  return text;
}

function buildQuestions() {
  return PROMPTS.map((p) => ({
    id: uuidv4(),
    kind: 'prompt',
    points: p.points,
    text: formatPromptText(p.text),
    rubric: { keyElements: p.keyElements, ...(p.commonErrors ? { commonErrors: p.commonErrors } : {}) },
  }));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const seq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });

  try {
    await seq.authenticate();
    await seq.transaction(async (transaction) => {
      const [existing] = await seq.query(
        `SELECT id FROM assignments WHERE course_id = :courseId AND title = :title`,
        { replacements: { courseId: COURSE_ID, title: TITLE }, transaction },
      );
      if (existing.length > 0) {
        const id = existing[0].id;
        const [[{ count: subCount }]] = await seq.query('SELECT count(*)::int AS count FROM submissions WHERE assignment_id = :id', { replacements: { id }, transaction });
        const [[{ count: gradeCount }]] = await seq.query('SELECT count(*)::int AS count FROM grades WHERE assignment_id = :id', { replacements: { id }, transaction });
        if (subCount > 0 || gradeCount > 0) {
          throw new Error(`Refusing to replace "${TITLE}" (id=${id}) — it already has ${subCount} submission(s)/${gradeCount} grade(s). Reseed manually if you're sure.`);
        }
        await seq.query('DELETE FROM assignments WHERE id = :id', { replacements: { id }, transaction });
        console.log(`Deleted prior untouched row (id=${id}) before reseeding.`);
      }

      const questions = buildQuestions();
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

      await seq.query(
        `INSERT INTO assignments
           (id, course_id, title, description, launch_briefing, max_score, order_index,
            is_published, type, grading_mode, scenario_name, drop_number, questions, role_filters,
            created_at, updated_at)
         VALUES
           (:id, :courseId, :title, :description, :launchBriefing, :maxScore, 2,
            false, 'challenge', 'squad', NULL, NULL, :questions, ARRAY[]::text[],
            NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            courseId: COURSE_ID,
            title: TITLE,
            description: DESCRIPTION,
            launchBriefing: CASE_NARRATIVE,
            maxScore: totalPoints,
            questions: JSON.stringify(questions),
          },
          transaction,
        },
      );

      console.log(`Seeded unpublished: "${TITLE}" (${questions.length} prompts, ${totalPoints} pts, order_index 2)`);
    });
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, TITLE, buildQuestions };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
