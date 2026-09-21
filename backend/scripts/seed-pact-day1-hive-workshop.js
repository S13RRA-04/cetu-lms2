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
 * Run: node backend/scripts/seed-pact-day1-hive-workshop.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const TITLE = 'Day 1 Workshop — Process & Cooperation Mapping (The Hive Ransomware Disruption)';

const CASE_NARRATIVE = `Below is the public record of a real, multinational ransomware disruption: the FBI's takedown of the Hive ransomware operation, announced January 26, 2023. Read it as a squad, then work the deliverables below.

A note on certainty: real cases are not published with a stated the-agent-used-exactly-this-instrument breakdown — that level of detail is usually sealed. Some of your answers will be well-supported by the public record; others will be your best reasoning from the framework. Mark which is which.

STEP 1
From mid-2021 onward, an actor group operating under the name "Hive" ran a ransomware-as-a-service scheme, ultimately compromising more than 1,500 victim organizations in over 80 countries, including hospitals, school districts, and critical-infrastructure operators. Affiliates carried out intrusions and encryption; the core group provided the ransomware, leak-site infrastructure, and negotiation portal, taking a share of each ransom.

STEP 2
Beginning in July 2022, the FBI gained access to Hive's back-end computer network — including two dedicated servers and a virtual private server at a hosting provider in California — and covertly monitored the group's operations for roughly six months. The servers had been leased using email addresses belonging to Hive members.

STEP 3
During the monitoring period, the FBI captured Hive's decryption keys and distributed more than 300 of them to victims who were actively under attack, plus over 1,000 more to earlier victims — preventing an estimated $130 million in ransom payments. Publicly reported examples include disrupted attacks on a Louisiana hospital and a Texas school district.

STEP 4
The investigation traced Hive's back-end infrastructure to two servers physically located at a hosting provider in Los Angeles. On the evening of January 25, 2023, pursuant to a court order, federal agents seized those servers.

STEP 5
In a coordinated action, the Netherlands' National High Tech Crime Unit gained access to two backup servers hosted in the Netherlands that mirrored Hive's main leak site, negotiation site, and other operational data. Germany's Federal Criminal Police (BKA) and the Reutlingen Police Headquarters also participated in the operation. Europol provided coordination support, including operational meetings and deployed experts.

STEP 6
The U.S., German, and Dutch seizure actions were executed in a coordinated, near-simultaneous window on the night of January 25–26, 2023. Hive's dark web leak site and negotiation portal were replaced with a law-enforcement seizure notice, displayed in English and Russian, crediting the U.S. Attorney's Office for the Middle District of Florida, the Department of Justice's Computer Crime and Intellectual Property Section, and "substantial assistance" from Europol.

STEP 7
No arrests were announced at the time of the disruption. FBI Director Christopher Wray stated the investigation was ongoing and that the government would continue working to identify Hive developers, administrators, and affiliates.

Sources: U.S. Department of Justice press release, "U.S. Department of Justice Disrupts Hive Ransomware Variant" (Jan. 26, 2023); public reporting from Reuters, BleepingComputer, CyberScoop, Bank Info Security, and the unsealed warrant affidavit as reported by NBC News.`;

const DESCRIPTION = 'Squad exercise following today’s Legal Framework lecture. Work through the real, public record of the FBI’s Hive ransomware disruption as a squad. For each of the 7 steps, identify the domestic legal authority you’d expect (SCA tier or Rule 41 provision) and why, any international-cooperation mechanism involved and why, the triad role most likely responsible, and whether your answer is clearly supported by the public record or your own reasoned inference — mark which. Then answer the squad synthesis questions together.';

const STEP_FACTS = [
  `From mid-2021 onward, an actor group operating under the name "Hive" ran a ransomware-as-a-service scheme, ultimately compromising more than 1,500 victim organizations in over 80 countries, including hospitals, school districts, and critical-infrastructure operators. Affiliates carried out intrusions and encryption; the core group provided the ransomware, leak-site infrastructure, and negotiation portal, taking a share of each ransom.`,
  `Beginning in July 2022, the FBI gained access to Hive's back-end computer network — including two dedicated servers and a virtual private server at a hosting provider in California — and covertly monitored the group's operations for roughly six months. The servers had been leased using email addresses belonging to Hive members.`,
  `During the monitoring period, the FBI captured Hive's decryption keys and distributed more than 300 of them to victims who were actively under attack, plus over 1,000 more to earlier victims — preventing an estimated $130 million in ransom payments. Publicly reported examples include disrupted attacks on a Louisiana hospital and a Texas school district.`,
  `The investigation traced Hive's back-end infrastructure to two servers physically located at a hosting provider in Los Angeles. On the evening of January 25, 2023, pursuant to a court order, federal agents seized those servers.`,
  `In a coordinated action, the Netherlands' National High Tech Crime Unit gained access to two backup servers hosted in the Netherlands that mirrored Hive's main leak site, negotiation site, and other operational data. Germany's Federal Criminal Police (BKA) and the Reutlingen Police Headquarters also participated in the operation. Europol provided coordination support, including operational meetings and deployed experts.`,
  `The U.S., German, and Dutch seizure actions were executed in a coordinated, near-simultaneous window on the night of January 25–26, 2023. Hive's dark web leak site and negotiation portal were replaced with a law-enforcement seizure notice, displayed in English and Russian, crediting the U.S. Attorney's Office for the Middle District of Florida, the Department of Justice's Computer Crime and Intellectual Property Section, and "substantial assistance" from Europol.`,
  `No arrests were announced at the time of the disruption. FBI Director Christopher Wray stated the investigation was ongoing and that the government would continue working to identify Hive developers, administrators, and affiliates.`,
];

const STEP_KEY_ELEMENTS = [
  [
    'Correctly identifies Step 1 as background only — no legal process has been used yet',
    'Connects the fact pattern to CFAA §1030(a)(5)/(a)(7) and, if proceeds are traced, §§1956/1957',
  ],
  [
    'Identifies Rule 41(b)(6) remote-access authority as the fit — infrastructure whose ownership/location were concealed through technological means',
    'Distinguishes this from a routine premises warrant',
    'Separately identifies the leasing email addresses as SCA Tier 1 subpoena material to the hosting provider or email provider',
    'Notes that subpoena plausibly preceded or ran parallel to the technical-access application',
  ],
  [
    'Recognizes an authorized technical collection has to stay inside the scope the warrant application described',
    'Identifies decryption-key distribution to victims as a disruption/victim-assistance action running alongside the ongoing collection',
    'Raises the coordination this requires with the U.S. Attorney’s Office and victims’ own counsel',
  ],
  [
    'Separates the two-step domestic process: (1) SCA Tier 1/Tier 2 process to identify the LA hosting account’s subscriber/leaseholder information, then (2) a Rule 41 search/seizure warrant to take possession of the physical servers and their content',
    'States that content of communications and stored data always requires a warrant',
  ],
  [
    'Recognizes this does not map cleanly onto one of the four named international-cooperation mechanisms',
    'Explains why it isn’t a classic bilateral MLAT (slow, document-heavy, OIA-routed) or simple Article 29 preservation',
    'Reaches the defensible reading: the Dutch and German seizures were each executed under their own countries’ domestic legal authority, coordinated through direct agency relationships and Europol — the ‘foreign partner runs parallel domestic process’ triad pattern',
  ],
  [
    'Identifies which triad role(s) carried the coordination and timing across agent, analyst, and foreign partner',
    'Engages with why the operation’s integrity depended on the near-simultaneous timing of the U.S., German, and Dutch seizures',
  ],
  [
    'Recognizes a disruption is not the end of the legal-process work',
    'Identifies that the agent/analyst/foreign-partner triad keeps operating after the headline event, building toward eventual charges that may take years and may occur in more than one country’s courts',
  ],
];

const COMMON_ERRORS = [
  'Presenting an inferred legal instrument as a confirmed fact instead of flagging it as reasoning from the framework — several steps are not confirmed to that level of detail in the public record',
  'Forcing Step 5 into one of the four named international-cooperation mechanisms instead of naming which it resembles and where it diverges',
  'Treating Rule 41(b)(6) remote-access authority as if it were a routine premises warrant',
  'Skipping the confidence column — every answer should mark whether it’s public-record-supported or your own inference',
];

const SYNTHESIS_QUESTIONS = [
  {
    text: 'SQUAD SYNTHESIS — Which domestic SCA tier would you expect was used to identify who leased the Los Angeles servers, before any seizure occurred? What in the case supports that?',
    keyElements: [
      'Correctly identifies SCA Tier 1 (subpoena) — and Tier 2 (2703(d)) where applicable — as what would identify the LA hosting account’s leaseholder, before any seizure',
      'Supports the answer with the specific case fact that the servers were physically located at an LA hosting provider and seized only after being identified',
    ],
  },
  {
    text: 'SQUAD SYNTHESIS — Is the international cooperation in this case best described by one of the four mechanisms from lecture (direct provider cooperation, Budapest Convention preservation, MLAT, 24/7 Network) — or does it suggest something the lecture didn’t name? Defend your answer either way.',
    keyElements: [
      'Directly engages the four named mechanisms and explains why Step 5 doesn’t cleanly fit one of them',
      'Defends the answer with case-specific reasoning rather than simply asserting it',
    ],
  },
  {
    text: 'SQUAD SYNTHESIS — Find the moment where the "foreign partner" role in the triad ran its own parallel process, rather than just supporting the U.S. action. What would have broken if that hadn’t been timed with the U.S. action?',
    keyElements: [
      'Correctly locates Step 5/6 as the moment the foreign partner ran its own domestic process rather than merely supporting the U.S. action',
      'Explains what would have broken without the near-simultaneous timing (e.g., mirrored infrastructure could have been used to reconstitute the operation)',
    ],
  },
  {
    text: 'SQUAD SYNTHESIS — This case ended in a disruption — seized infrastructure, distributed decryption keys — without announced arrests. What does that mean is still left to do, and for which role in the triad?',
    keyElements: [
      'Identifies that no arrests were announced and the investigation continues toward identifying developers, administrators, and affiliates',
      'Connects this to what each triad role does next (agent: continued investigation/coordination; analyst: continued assessment; foreign partners: continued cooperation toward eventual charges)',
    ],
  },
];

function buildQuestions() {
  const stepPrompts = STEP_FACTS.map((fact, i) => ({
    id: uuidv4(),
    kind: 'prompt',
    points: 8,
    text: `STEP ${i + 1} — ${fact}\n\nFor this step, identify: the domestic legal authority you'd expect (SCA tier or Rule 41 provision) and why; any international-cooperation mechanism involved and why; the triad role (agent / analyst / foreign partner) most likely responsible; and whether your answer is clearly supported by the public record or is your own reasoned inference from the framework — mark which.`,
    rubric: { keyElements: STEP_KEY_ELEMENTS[i], commonErrors: COMMON_ERRORS },
  }));

  const synthesisPrompts = SYNTHESIS_QUESTIONS.map((q) => ({
    id: uuidv4(),
    kind: 'prompt',
    points: 11,
    text: q.text,
    rubric: { keyElements: q.keyElements, commonErrors: COMMON_ERRORS },
  }));

  return [...stepPrompts, ...synthesisPrompts];
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
        console.log(`Already seeded (id=${existing[0].id}) — skipping. Delete it first if you want to reseed.`);
        return;
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
