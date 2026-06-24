'use strict';
/**
 * Seed PACKET HEIST — Drop 1 challenge assignments.
 *
 * Creates two challenge assignments for Squad 1 / Redstone Memorial Hospital:
 *
 *   1. "PACKET HEIST — Drop 1: Initial Victim Analysis"
 *      12 quiz questions (MCQ, T/F, fill-blank, drag-match) auto-graded by QuizFlow.
 *
 *   2. "PACKET HEIST — Drop 1: Squad Deliverables"
 *      5 prompt-based squad submissions graded by instructor (ChallengeFlow).
 *
 * Run: node backend/scripts/seed-packet-heist-drop1.js
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

/* ─────────────────────────────────────────────────────────────────────────────
   Challenge 1 questions — Initial Victim Analysis (quiz)
───────────────────────────────────────────────────────────────────────────── */
const analysisQuestions = [
  {
    id:   uuidv4(),
    stem: 'What specific activity caused Redstone Memorial Hospital to report the incident?',
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'single',
      shuffle:       true,
      options: [
        { id: 'a', text: 'A ransomware alert on the hospital\'s EMR system' },
        { id: 'b', text: 'Suspicious post-login activity on RMH-FAC-SUP01, including PowerShell execution, scheduled task creation, administrative share enumeration, and outbound TLS communication' },
        { id: 'c', text: 'An employee reported unauthorized physical access to the server room' },
        { id: 'd', text: 'Billing system anomalies flagged by the payment processor' },
      ],
      correct: ['b'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'The incident report was triggered by suspicious post-login activity on RMH-FAC-SUP01, a non-clinical vendor support server.',
      incorrect: 'Review the initial victim production. The report centered on server-level post-login activity — not ransomware, physical access, or billing systems.',
      reference: 'Student Analysis Questions — Q1',
    },
  },

  {
    id:   uuidv4(),
    stem: 'Which of the following elements support a finding of unauthorized access? (Select all that apply)',
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'multiple',
      shuffle:       true,
      options: [
        { id: 'a', text: 'Successful remote logon using account fac-vendor-svc17' },
        { id: 'b', text: 'No approved maintenance window existed for the activity period' },
        { id: 'c', text: 'Victim statement that no employee or approved vendor authorized the activity' },
        { id: 'd', text: 'The server was running an outdated, unpatched operating system' },
        { id: 'e', text: 'Suspicious command execution and creation of a scheduled task' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'Unauthorized access is supported by the logon, absence of an approved maintenance window, suspicious commands, and the victim\'s statement.',
      incorrect: 'Focus on what the evidence directly shows. OS patch level is not part of the initial production and does not on its own establish unauthorized access.',
      reference: 'Student Analysis Questions — Q2',
    },
  },

  {
    id:   uuidv4(),
    stem: 'What account was used during the unauthorized activity? (Enter as DOMAIN\\username or username only)',
    payload: {
      kind:   'fill_blank',
      blanks: [
        { accepted: ['rmh\\fac-vendor-svc17', 'fac-vendor-svc17', 'rmh/fac-vendor-svc17'], caseSensitive: false },
      ],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'Correct — RMH\\fac-vendor-svc17 was the account used during the unauthorized session.',
      incorrect: 'The account identified in the victim production is fac-vendor-svc17 in the RMH domain.',
      reference: 'Student Analysis Questions — Q3',
    },
  },

  {
    id:   uuidv4(),
    stem: 'The use of account fac-vendor-svc17 is sufficient to identify the threat actor.',
    payload: {
      kind:    'true_false',
      correct: false,
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'Correct — the account identifies what was used, not who used it. Determining actor identity requires account ownership records, VPN logs, and additional context.',
      incorrect: 'Account identity ≠ actor identity. The account may have been compromised, shared, or obtained without the account owner\'s knowledge.',
      reference: 'Student Analysis Questions — Q4',
    },
  },

  {
    id:   uuidv4(),
    stem: 'What was the affected system in the initial victim production?',
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'single',
      shuffle:       true,
      options: [
        { id: 'a', text: 'RMH-EMR-PROD01 — the primary electronic medical records server' },
        { id: 'b', text: 'RMH-FAC-SUP01 — a non-clinical vendor support server in the administrative/facilities support segment' },
        { id: 'c', text: 'RMH-PAY-DB01 — the hospital payment processing database' },
        { id: 'd', text: 'RMH-WORKSTATION-42 — an employee administrative workstation' },
      ],
      correct: ['b'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'RMH-FAC-SUP01 is the affected system — a non-clinical vendor support server, not a clinical or patient-facing system.',
      incorrect: 'The victim production specifically identifies RMH-FAC-SUP01. No clinical systems were shown to be involved in the initial packet.',
      reference: 'Student Analysis Questions — Q5',
    },
  },

  {
    id:   uuidv4(),
    stem: 'Which systems were NOT shown to be affected in the initial victim production? (Select all that apply)',
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'multiple',
      shuffle:       true,
      options: [
        { id: 'a', text: 'EMR / electronic medical records systems' },
        { id: 'b', text: 'Patient-care and clinical operations systems' },
        { id: 'c', text: 'Medical devices' },
        { id: 'd', text: 'RMH-FAC-SUP01 (the vendor support server)' },
        { id: 'e', text: 'Payment processing systems' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'No EMR systems, patient-care systems, medical devices, or payment systems were shown to be affected. Scope is limited to RMH-FAC-SUP01.',
      incorrect: 'Distinguish what the evidence shows vs. what it does not show. Only RMH-FAC-SUP01 was identified — all other systems are currently out of scope.',
      reference: 'Student Analysis Questions — Q6',
    },
  },

  {
    id:   uuidv4(),
    stem: 'Match each observed post-login action to its investigative category.',
    payload: {
      kind:    'drag_match',
      sources: [
        { id: 'ps',   text: 'PowerShell execution' },
        { id: 'scht', text: 'Scheduled task creation' },
        { id: 'enu',  text: 'Administrative share enumeration' },
        { id: 'dir',  text: 'Directory listing file creation and compression' },
        { id: 'tls',  text: 'Outbound TLS connection to external IP' },
      ],
      targets: [
        { id: 'exec',  text: 'Command / Code Execution' },
        { id: 'pers',  text: 'Persistence Mechanism' },
        { id: 'disc',  text: 'Discovery / Reconnaissance' },
        { id: 'stage', text: 'Data Staging' },
        { id: 'c2',    text: 'C2 / Exfiltration Channel' },
      ],
      matches: [
        { sourceId: 'ps',   targetId: 'exec'  },
        { sourceId: 'scht', targetId: 'pers'  },
        { sourceId: 'enu',  targetId: 'disc'  },
        { sourceId: 'dir',  targetId: 'stage' },
        { sourceId: 'tls',  targetId: 'c2'    },
      ],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'Correct — each observed action maps to a distinct phase of post-exploitation TTPs.',
      incorrect: 'Review MITRE ATT&CK categories. Enumeration → Discovery, scheduled task → Persistence, outbound TLS → C2/Exfiltration.',
      reference: 'Student-Facing Tasking — Cyber Analyst Required Output',
    },
  },

  {
    id:   uuidv4(),
    stem: 'The initial evidence packet confirms PHI exfiltration from Redstone Memorial Hospital.',
    payload: {
      kind:    'true_false',
      correct: false,
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'Correct — there is no confirmed PHI exfiltration. Outbound TLS communication creates suspicion but does not confirm data was exfiltrated.',
      incorrect: 'Outbound communication creates exfiltration suspicion — not confirmation. Avoid stating what the evidence does not yet prove.',
      reference: 'Student Analysis Questions — Q8',
    },
  },

  {
    id:   uuidv4(),
    stem: 'Why is the creation of a scheduled task significant in this investigation?',
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'single',
      shuffle:       true,
      options: [
        { id: 'a', text: 'It proves the actor is an internal employee with privileged access' },
        { id: 'b', text: 'It confirms data was exfiltrated to an external server' },
        { id: 'c', text: 'It may indicate a persistence mechanism — created by an account with unclear ownership during unauthorized activity' },
        { id: 'd', text: 'It was the action that triggered the victim\'s initial incident report' },
      ],
      correct: ['c'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'Scheduled task creation during an unauthorized session suggests the actor may have sought persistent access or repeated execution.',
      incorrect: 'Avoid over-attribution. The scheduled task is significant because it suggests persistence intent — not because it identifies the actor or confirms exfiltration.',
      reference: 'Student Analysis Questions — Q9',
    },
  },

  {
    id:   uuidv4(),
    stem: 'Which of the following records should the squad request to advance the investigation? (Select all that apply)',
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'multiple',
      shuffle:       true,
      options: [
        { id: 'a', text: 'Account creation records and ownership history for fac-vendor-svc17' },
        { id: 'b', text: 'Password reset history for fac-vendor-svc17' },
        { id: 'c', text: 'Prior login history and VPN/RDP access logs for the account' },
        { id: 'd', text: 'Full EDR telemetry and firewall/proxy logs for RMH-FAC-SUP01' },
        { id: 'e', text: 'Vendor support records and maintenance tickets covering the activity window' },
        { id: 'f', text: 'Clinical staff personnel files and patient admission records' },
      ],
      correct: ['a', 'b', 'c', 'd', 'e'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'All records relating to the account, system telemetry, and vendor access are appropriate. Clinical/patient records are out of scope given current evidence.',
      incorrect: 'Focus requests on what directly addresses investigative gaps: account provenance, access history, and system telemetry. Clinical records are not yet supported by scope.',
      reference: 'Student Analysis Questions — Q10',
    },
  },

  {
    id:   uuidv4(),
    stem: 'Which is the most accurate scope statement for this incident based on the initial victim production?',
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'single',
      shuffle:       true,
      options: [
        { id: 'a', text: 'Confirmed compromise of EMR systems with potential PHI exfiltration affecting patient care.' },
        { id: 'b', text: 'Confirmed unauthorized activity on a non-clinical administrative/facilities support server. No current evidence of patient-care disruption, EMR compromise, medical device impact, ransomware, or confirmed PHI exfiltration.' },
        { id: 'c', text: 'Suspected ransomware attack affecting both clinical and administrative hospital systems.' },
        { id: 'd', text: 'Unauthorized access to all hospital systems; full scope unknown and cannot be assessed.' },
      ],
      correct: ['b'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'A proper scope statement confirms what is known, limits to what evidence supports, and explicitly states what is NOT impacted.',
      incorrect: 'Scope statements must be precise. Don\'t expand beyond what evidence supports — and always state what is not impacted when that is clear.',
      reference: 'Student Analysis Questions — Q11',
    },
  },

  {
    id:   uuidv4(),
    stem: 'Which conclusions should the squad AVOID reaching prematurely? (Select all that apply)',
    payload: {
      kind:          'multiple_choice',
      selectionMode: 'multiple',
      shuffle:       true,
      options: [
        { id: 'a', text: 'That the creator of the fac-vendor-svc17 account is the intruder' },
        { id: 'b', text: 'That data was definitively exfiltrated based on the outbound connection' },
        { id: 'c', text: 'That unauthorized access occurred on RMH-FAC-SUP01' },
        { id: 'd', text: 'That this is attributable to a specific person or vendor without corroborating evidence' },
        { id: 'e', text: 'That the account owner\'s identity is established without ownership records' },
      ],
      correct: ['a', 'b', 'd', 'e'],
    },
    scoring:  { points: 10, mustPass: false },
    feedback: {
      correct:   'Premature attribution and unsupported conclusions undermine investigative integrity. Account creation ≠ intrusion; outbound traffic ≠ confirmed exfiltration.',
      incorrect: 'Option C (unauthorized access) IS supportable — the victim statement and evidence back it. The others are premature without additional records.',
      reference: 'Student Analysis Questions — Q12',
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Challenge 2 questions — Squad Deliverables (prompt-style, instructor-graded)
   Based on Student-Facing Tasking required outputs and Command Post Template.
───────────────────────────────────────────────────────────────────────────── */
const deliverableQuestions = [
  {
    kind: 'prompt',
    text: 'Command Post Briefing Summary — Provide: (1) a 2-3 sentence incident summary, (2) confirmed affected systems, (3) systems confirmed NOT affected, and (4) the top outstanding unknowns your squad has identified.',
  },
  {
    kind: 'prompt',
    text: 'Actor Timeline — Build a preliminary timeline of the actor\'s post-login activity on RMH-FAC-SUP01. List each observed action in chronological order with approximate timestamps (if determinable from the packet), and briefly note what each action suggests about actor intent.',
  },
  {
    kind: 'prompt',
    text: 'Investigative Gaps & Records Requests — List every gap identified from the Drop 1 packet. For each gap, specify the record or artifact you are requesting and explain what investigative question that record will help answer.',
  },
  {
    kind: 'prompt',
    text: 'Account Analysis — What is known and unknown about account fac-vendor-svc17 based on the current evidence? Does its use narrow or eliminate any hypotheses about actor identity or affiliation? Explain your reasoning.',
  },
  {
    kind: 'prompt',
    text: 'Scope Determination — Write your squad\'s formal scope statement for this incident. Address: (a) what is confirmed in scope, (b) what is confirmed out of scope, (c) what remains undetermined, and (d) whether any immediate escalation or notification steps are warranted at this stage and why.',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────────────────── */
(async () => {
  await seq.authenticate();
  console.log('PostgreSQL connected\n');

  // Remove previous seeds for these two challenges
  await seq.query(
    `DELETE FROM assignments WHERE course_id = :courseId AND title IN (
       'PACKET HEIST — Drop 1: Initial Victim Analysis',
       'PACKET HEIST — Drop 1: Squad Deliverables'
     )`,
    { replacements: { courseId: COURSE_ID } },
  );
  console.log('Cleared previous seed (if any)\n');

  const [[{ next: oi0 }]] = await seq.query(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
    { replacements: { courseId: COURSE_ID } },
  );
  const oi       = Number(oi0);
  const maxScore = analysisQuestions.reduce((s, q) => s + q.scoring.points, 0);
  const quizId   = uuidv4();
  const delivId  = uuidv4();

  // Challenge 1: Analysis Quiz
  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, scenario_name, victim_name, drop_number, questions, role_filters, created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', 'squad', :maxScore, :oi,
        false, 'packet-heist', 'Redstone Memorial Hospital', 1, :questions, '{}', NOW(), NOW())`,
    {
      replacements: {
        id:          quizId,
        courseId:    COURSE_ID,
        title:       'PACKET HEIST — Drop 1: Initial Victim Analysis',
        description: 'Review the Drop 1 evidence packet for Redstone Memorial Hospital and answer each question based strictly on what the evidence supports. Avoid speculation.',
        maxScore,
        oi,
        questions:   JSON.stringify(analysisQuestions),
      },
    },
  );
  console.log(`✓ Challenge 1 — Initial Victim Analysis`);
  console.log(`  ID: ${quizId} | Questions: ${analysisQuestions.length} | Max: ${maxScore} pts`);

  // Challenge 2: Squad Deliverables
  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, scenario_name, victim_name, drop_number, questions, role_filters, created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', 'squad', 100, :oi2,
        false, 'packet-heist', 'Redstone Memorial Hospital', 1, :questions, '{}', NOW(), NOW())`,
    {
      replacements: {
        id:       delivId,
        courseId: COURSE_ID,
        title:    'PACKET HEIST — Drop 1: Squad Deliverables',
        description: [
          'Squad 1 · Redstone Memorial Hospital · Drop 1',
          '',
          'Complete all five deliverables as a squad. Your responses will be reviewed and graded by command.',
          'Base every response on evidence in the Drop 1 packet. Cite specific artifacts where applicable.',
          'These deliverables feed directly into your Command Post briefing.',
        ].join('\n'),
        oi2:       oi + 1,
        questions: JSON.stringify(deliverableQuestions),
      },
    },
  );
  console.log(`✓ Challenge 2 — Squad Deliverables`);
  console.log(`  ID: ${delivId} | Prompts: ${deliverableQuestions.length}`);

  console.log('\nBoth challenges seeded. Unlock via Content Gating → Challenges when ready.\n');
  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
