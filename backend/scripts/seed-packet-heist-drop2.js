'use strict';
/**
 * Seed PACKET HEIST — Drop 2 challenge assignments: Cross-Victim Correlation.
 *
 * Unlike Drop 1 (one quiz + one deliverable set PER victim), Drop 2 is a
 * single shared exercise — every squad receives the same Command Post
 * Bulletin, Cross-Victim Indicator Matrix, Behavior Comparison Table, and
 * Hypothesis Board, and is asked to compare its own Drop 1 victim against
 * the other three to assess whether a common upstream access source connects
 * them. Content is grounded directly in the real source documents under
 * scenarios/PACKET HEIST/Drop 2/ in R2 (Command Post Bulletin 001, Cross-
 * Victim Indicator Matrix, Cross-Victim Behavior Comparison Table,
 * Preliminary Hypothesis Board, Command Post Guidance, Dormant Account
 * Pattern Worksheet, Lead Request Menu, What This Does Not Prove - Notice,
 * Updated CP Submission Template).
 *
 * Run: node backend/scripts/seed-packet-heist-drop2.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

const DROP_2_LAUNCH_BRIEFING = [
  'The Command Post has received preliminary reports from Task Force Squads indicating an uptick in cyber incidents perpetrated against Huntsville-area businesses over the past several months. Analysis of these reports indicates that commonalities may exist among the victims.',
  'New task force guidance directs each squad to conduct further investigation to determine whether these incidents are related or should be investigated independently. Command Post analysts have compiled new analytical data to aid task force participants, and those materials are being distributed to each squad.',
  'AUSA concurrence has been obtained to proceed with predicated investigations on the basis that these incidents may represent a greater threat to the area of responsibility.',
].join('\n\n');

/* ─────────────────────────────────────────────────────────────────────────────
   Cross-Victim Correlation questions (quiz)
───────────────────────────────────────────────────────────────────────────── */
const analysisQuestions = [
  {
    id: uuidv4(),
    stem: 'Per Command Post Bulletin 001, does Command Post currently assess that the four incidents were conducted from a single shared source IP or by a single confirmed hands-on-keyboard actor?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Yes — Command Post has confirmed a single shared actor across all four victims' },
        { id: 'b', text: 'No — the observed activity differs across victims and appears to involve different access methods, infrastructure, and objectives' },
        { id: 'c', text: 'Yes, but only for Redstone and CyberDyne' },
        { id: 'd', text: 'Command Post has not yet reviewed any of the four victim productions' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Command Post explicitly does not assess a single shared source IP or single confirmed actor — the four incidents differ in access method, infrastructure, and apparent objective.',
      incorrect: 'Review Bulletin 001. Command Post has NOT confirmed a single actor or shared source IP — it identifies recurring themes without concluding a common operator.',
      reference: 'Command Post Bulletin 001',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which recurring themes did Command Post identify across all four victim intrusions? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Each victim reported confirmed unauthorized activity' },
        { id: 'b', text: 'Each incident involved a victim-side account with vendor, maintenance, support, or integration characteristics' },
        { id: 'c', text: 'Each account existed before the reported intrusion' },
        { id: 'd', text: 'Each victim immediately identified the current account owner' },
        { id: 'e', text: 'None of the incidents caused confirmed operational disruption' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Confirmed unauthorized activity, vendor/support-style accounts that predate the intrusion, and no confirmed operational disruption are all recurring themes. Critically, NO victim could identify the current account owner — the opposite of option D.',
      incorrect: 'Re-check Bulletin 001 — every victim could NOT immediately identify the current owner of the account used. That is one of the key recurring themes, not an exception.',
      reference: 'Command Post Bulletin 001',
    },
  },
  {
    id: uuidv4(),
    stem: 'The current evidence proves that a single actor conducted all four intrusions.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — per "What This Does Not Prove," the evidence does not establish that a single actor conducted all four intrusions.',
      incorrect: 'The "What This Does Not Prove" notice explicitly lists single-actor attribution as unproven at this stage.',
      reference: 'What This Does Not Prove - Notice',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per Command Post Guidance, what is the current PACT task force investigative priority?',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['upstream access source', 'common upstream access source', 'a common upstream access source', 'determine the upstream access source', 'determining the upstream access source'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the task force priority is determining how separate downstream intruders obtained access to multiple victim-side accounts, i.e. whether a common upstream access source connects the four victims.',
      incorrect: 'Per Command Post Guidance, the priority is identifying the common upstream access source behind the four victims’ compromised accounts.',
      reference: 'Command Post Guidance',
    },
  },
  {
    id: uuidv4(),
    stem: 'According to the Cross-Victim Indicator Matrix, which victim shows the only confirmed (even if limited) data exfiltration?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Redstone Memorial Hospital' },
        { id: 'b', text: 'Dogwood Hotel' },
        { id: 'c', text: 'CyberDyne Data Center — limited customer metadata was exported' },
        { id: 'd', text: 'Pixel Play Arcade' },
      ],
      correct: ['c'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'CyberDyne is the only victim in the matrix marked with confirmed (limited) data theft — exported customer metadata. The other three show "Not confirmed."',
      incorrect: 'Check the "Confirmed Data Theft" row for each victim in the Indicator Matrix — only CyberDyne shows a confirmed export.',
      reference: 'Cross-Victim Indicator Matrix',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following are accurate based on the Cross-Victim Indicator Matrix? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Every victim’s intruder source IP is different from the others' },
        { id: 'b', text: 'The current owner of the account used is unknown at all four victims' },
        { id: 'c', text: 'A destination/callback IP was observed for Redstone but not for the other three victims' },
        { id: 'd', text: 'All four accounts were created after the intrusion was discovered' },
      ],
      correct: ['a', 'b', 'c'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Each victim has a distinct source IP, none have a known current account owner, and only Redstone shows an observed destination/callback IP (203.0.113.44). All four accounts predate their intrusions, not the reverse.',
      incorrect: 'Re-check account creation dates in the matrix — every account existed BEFORE its respective intrusion, not after.',
      reference: 'Cross-Victim Indicator Matrix',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each victim to the account type used in its intrusion, per the Cross-Victim Indicator Matrix.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'redstone', text: 'Redstone Memorial Hospital' },
        { id: 'dogwood',  text: 'Dogwood Hotel' },
        { id: 'cyberdyne', text: 'CyberDyne Data Center' },
        { id: 'pixelplay', text: 'Pixel Play Arcade' },
      ],
      targets: [
        { id: 'facilities', text: 'Facilities/vendor support' },
        { id: 'network',    text: 'Guest wireless/network support' },
        { id: 'integration', text: 'Legacy integration/customer sync' },
        { id: 'pos',         text: 'POS maintenance' },
      ],
      matches: [
        { sourceId: 'redstone',   targetId: 'facilities' },
        { sourceId: 'dogwood',    targetId: 'network' },
        { sourceId: 'cyberdyne',  targetId: 'integration' },
        { sourceId: 'pixelplay',  targetId: 'pos' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — each victim’s compromised account maps to a distinct vendor/support role, all sharing the broader pattern of vendor- or maintenance-style accounts.',
      incorrect: 'Review the "Account Type" field for each victim in the Cross-Victim Indicator Matrix.',
      reference: 'Cross-Victim Indicator Matrix',
    },
  },
  {
    id: uuidv4(),
    stem: 'The Preliminary Hypothesis Board concludes that Hypothesis 3 (different downstream intruders using access from a common upstream source) is confirmed.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — Command Post’s position is that Hypothesis 3 is "plausible but unproven," not confirmed. The next priority is account lifecycle and ownership.',
      incorrect: 'The Hypothesis Board explicitly labels Hypothesis 3 as plausible but unproven — avoid treating a working theory as a confirmed conclusion.',
      reference: 'Preliminary Hypothesis Board',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following IS supported by current evidence, per the "What This Does Not Prove" notice?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'That a specific vendor or MSP is responsible' },
        { id: 'b', text: 'That foreign actors are involved' },
        { id: 'c', text: 'Confirmed unauthorized activity at all four victims, using accounts with unclear current ownership that existed before the intrusion' },
        { id: 'd', text: 'That every victim suffered operational disruption' },
      ],
      correct: ['c'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The evidence supports confirmed unauthorized activity, use of vendor/support-style accounts with unclear ownership that predate the intrusions — but not vendor/MSP responsibility, foreign involvement, or operational disruption.',
      incorrect: 'Review the "does support" list carefully — vendor/MSP attribution, foreign involvement, and operational disruption are all in the "does NOT prove" column.',
      reference: 'What This Does Not Prove - Notice',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per Command Post Guidance, which leads should be cut to the appropriate investigative squad rather than retained as a PACT task force priority?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Leads that help explain how multiple victims’ access was obtained, stored, sold, brokered, or supplied' },
        { id: 'b', text: 'Source infrastructure, buyer handles, malware/tooling, or intrusion-specific indicators tied to one victim only' },
        { id: 'c', text: 'Any lead involving a vendor or support account' },
        { id: 'd', text: 'Leads that come from the Dormant Account Pattern Worksheet' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Single-victim-only leads (source infrastructure, buyer handles, malware/tooling, victim-specific indicators) get cut to the appropriate squad. Leads explaining how multiple victims’ access connects stay a PACT task force priority.',
      incorrect: 'Re-read the Lead Handling Guidance — the distinguishing factor is whether a lead is single-victim-specific (cut) or explains a multi-victim connection (retained).',
      reference: 'Command Post Guidance',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which categories of records would help establish an account’s lifecycle (active, dormant, legacy, or intentionally preserved)? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Account creation records and last password change date' },
        { id: 'b', text: 'MFA requirement status and interactive/remote login permissions' },
        { id: 'c', text: 'Prior login history and last known approved use' },
        { id: 'd', text: 'Guest reservation or loyalty program records' },
      ],
      correct: ['a', 'b', 'c'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Creation records, password change history, MFA/login permission settings, and prior login/approved-use history all speak to account lifecycle. Guest reservation records do not.',
      incorrect: 'Focus on fields from the Dormant Account Pattern Worksheet that describe the account itself, not unrelated business records.',
      reference: 'Dormant Account Pattern Worksheet',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the account history alone prove about who used the account during the intrusion?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'It proves the account creator used it' },
        { id: 'b', text: 'It proves the last known approved user used it' },
        { id: 'c', text: 'Nothing by itself — distinguishing the account creator from the account user requires additional evidence such as credential access records' },
        { id: 'd', text: 'It proves the vendor associated with the account used it' },
      ],
      correct: ['c'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Account history alone does not establish who used the credentials during the intrusion — that requires records identifying who had access to the credentials, separate from who created or is nominally associated with the account.',
      incorrect: 'Avoid conflating account creator, associated vendor/employee, and actual intruder — these are separate facts requiring separate evidence.',
      reference: 'Dormant Account Pattern Worksheet',
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Squad Deliverables (prompt-style, instructor-graded)
   Based on the Updated CP Submission Template, condensed to 5 deliverables
   matching the Drop 1 pattern.
───────────────────────────────────────────────────────────────────────────── */
const deliverableQuestions = [
  {
    kind: 'prompt', points: 20,
    text: 'Updated Incident Summary & Account Lifecycle Assessment — Summarize what happened to your squad’s assigned victim based on current evidence, then assess the account used: is it a legitimate active account misused by an intruder, a dormant account later compromised, a legacy account left enabled after support work, an account intentionally preserved for later misuse, or one whose lifecycle cannot yet be determined? Explain your reasoning.',
    rubric: {
      keyElements: [
        'Concise, accurate summary of the victim’s Drop 1 incident (system, account, observed activity)',
        'Selects one of the lifecycle categories (active/dormant/legacy/intentionally preserved/undetermined) and explains the choice',
        'Reasoning is tied to specific evidence (creation date, last known approved use, interactive/remote login permissions) rather than speculation',
        'Acknowledges what is NOT yet known about the account’s lifecycle',
      ],
      commonErrors: ['Restating the Drop 1 summary without adding lifecycle analysis', 'Picking a lifecycle category without evidentiary support', 'Treating an unproven lifecycle theory as settled fact'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Cross-Victim Comparison — Compare your squad’s victim against the other three using the Cross-Victim Indicator Matrix and Behavior Comparison Table. What similarities and differences exist in account type, observed behavior, source infrastructure, and impact?',
    rubric: {
      keyElements: [
        'Identifies at least 2 concrete similarities across victims (e.g., all accounts predate intrusion, all owners unknown, all vendor/support-style accounts)',
        'Identifies at least 2 concrete differences (e.g., different source IPs, different observed behaviors, only CyberDyne shows confirmed data export)',
        'Draws on specific data from the Indicator Matrix and Behavior Comparison Table rather than generic statements',
        'Avoids concluding a single shared actor or single shared infrastructure from surface-level similarity',
      ],
      commonErrors: ['Comparing only two victims instead of all four', 'Treating shared account TYPE (vendor/support) as proof of a shared actor', 'Omitting the CyberDyne data-export distinction'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Actor & Infrastructure Assessment — What do you currently know, and not know, about the identity of the person or entity that used the account in your victim’s intrusion? Assess the source and destination/callback infrastructure and its attribution value.',
    rubric: {
      keyElements: [
        'Clearly separates "account identity" from "actor identity" — using the account does not identify who used it',
        'States the known source IP (and destination/callback IP, if any) for the assigned victim',
        'Explains the limited attribution value of a single IP address absent corroborating records',
        'Identifies what additional evidence (e.g., ISP/subscriber records, correlated infrastructure across victims) would strengthen attribution',
      ],
      commonErrors: ['Treating the source IP alone as sufficient for attribution', 'Conflating account owner, account creator, and intruder', 'Failing to note when no destination/callback IP was observed'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Lead Requests & Investigative Gaps — Using the Lead Request Menu categories, list the specific records your squad is requesting to advance the investigation. For each, state what fact you are trying to prove or disprove, and note which leads (if any) should be cut to another squad per Command Post Guidance rather than kept as a PACT task force priority.',
    rubric: {
      keyElements: [
        'Requests drawn from real Lead Request Menu categories (account records, vendor records, technical logs, business/field records, preservation requests)',
        'Each request is paired with the specific fact it is meant to prove or disprove, not just a record name',
        'Distinguishes victim-specific leads (candidates to cut to another squad) from leads that would explain a multi-victim connection (PACT task force priority)',
        'At least one preservation request included (e.g., account metadata, portal exports, host image)',
      ],
      commonErrors: ['Listing records with no stated investigative question', 'Treating every lead as a PACT task force priority regardless of scope', 'Omitting preservation requests'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Integrated Squad Assessment — State your squad’s current position on Hypotheses 1, 2, and 3 from the Preliminary Hypothesis Board (unrelated intrusions, single shared actor, or common upstream access source with different downstream intruders). Which is best supported by your victim’s evidence, and what is your squad’s recommended next investigative step? Include a "What We Are Not Claiming Yet" list.',
    rubric: {
      keyElements: [
        'Explicitly addresses all three hypotheses, not just the squad’s preferred one',
        'Ties the chosen hypothesis to specific evidence from the assigned victim and the cross-victim comparison, with appropriate hedging (Hypothesis 3 is "plausible but unproven" per Command Post, not confirmed)',
        'States a concrete recommended next step (not a vague "continue investigating")',
        '"What We Are Not Claiming Yet" list includes at least 3 specific unsupported conclusions (e.g., single actor, vendor/MSP responsibility, foreign involvement)',
      ],
      commonErrors: ['Declaring a hypothesis "confirmed" rather than "supported" or "plausible"', 'Ignoring the other two hypotheses entirely', 'Vague or missing recommended next step', 'Omitting the "not claiming yet" list'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────────────────── */
(async () => {
  await seq.authenticate();
  console.log('PostgreSQL connected\n');

  const analysisTitle    = 'PACKET HEIST — Drop 2: Cross-Victim Correlation';
  const deliverableTitle = 'PACKET HEIST — Drop 2: Squad Deliverables';

  // Remove previous seeds for these two challenges (shared across all squads —
  // no victim_name, unlike Drop 1's per-victim pairs)
  await seq.query(
    `DELETE FROM assignments WHERE course_id = :courseId AND scenario_name = 'packet-heist' AND drop_number = 2 AND title IN (:t1, :t2)`,
    { replacements: { courseId: COURSE_ID, t1: analysisTitle, t2: deliverableTitle } },
  );
  console.log('Cleared previous Drop 2 seed (if any)\n');

  const [[{ next: oi0 }]] = await seq.query(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
    { replacements: { courseId: COURSE_ID } },
  );
  const oi       = Number(oi0);
  const maxScore = analysisQuestions.reduce((s, q) => s + q.scoring.points, 0);
  const quizId   = uuidv4();
  const delivId  = uuidv4();

  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, launch_briefing, type, grading_mode, max_score, order_index,
        is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, :launchBriefing, 'challenge', 'squad', :maxScore, :oi,
        false, 'packet-heist', 2, :questions, '{}', NOW(), NOW())`,
    {
      replacements: {
        id:          quizId,
        courseId:    COURSE_ID,
        title:       analysisTitle,
        description: 'Command Post has released a cross-victim comparison of all four Drop 1 intrusions. Review the Cross-Victim Indicator Matrix, Behavior Comparison Table, Preliminary Hypothesis Board, and related Command Post guidance, then answer each question based strictly on what the evidence supports.',
        launchBriefing: DROP_2_LAUNCH_BRIEFING,
        maxScore,
        oi,
        questions:   JSON.stringify(analysisQuestions),
      },
    },
  );
  console.log(`✓ Cross-Victim Correlation — ID: ${quizId} | ${analysisQuestions.length} questions | ${maxScore} pts`);

  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', 'squad', 100, :oi2,
        false, 'packet-heist', 2, :questions, '{}', NOW(), NOW())`,
    {
      replacements: {
        id:       delivId,
        courseId: COURSE_ID,
        title:    deliverableTitle,
        description: [
          'PACKET HEIST · Drop 2 — Cross-Victim Correlation',
          '',
          'Complete all five deliverables as a squad, comparing your assigned Drop 1 victim against the',
          'other three using the Drop 2 Command Post materials. Your responses will be reviewed and',
          'graded by command. Base every response on evidence in the Drop 1 and Drop 2 packets.',
        ].join('\n'),
        oi2:       oi + 1,
        questions: JSON.stringify(deliverableQuestions),
      },
    },
  );
  console.log(`✓ Squad Deliverables — ID: ${delivId} | ${deliverableQuestions.length} prompts`);

  console.log('\nBoth seeded unpublished, shared across all squads (no victim_name). Assign per squad and unlock via Command → Content Gating when ready.\n');
  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
