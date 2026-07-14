'use strict';
/**
 * Seed PACKET HEIST — Drop 4 challenge assignments: RestonIT Nexus
 * Investigation. Shared across all squads (like Drop 2) — Command Post
 * Bulletin 003 formally identifies RestonIT LLC as the shared MSP/access
 * custodian behind all four compromised accounts, and Drop 4 turns the
 * investigation onto RestonIT itself: its business profile, three named
 * employees, per-victim contracts, a possible MSP-compromise lead (phishing
 * + failed logins against RestonIT's own support inbox), and a four-way
 * hypothesis board (uninvolved vendor, compromised MSP, negligent custodian,
 * intentional insider).
 *
 * Source: scenarios/PACKET HEIST/Drop 4/Command Post Bulletin 003.md,
 * Draft Preservation Letter Categories.md, and everything under
 * scenarios/PACKET HEIST/Drop 4/RestonIT/ (Business Profile, Services
 * Overview, Client Relationship Matrix, Employee Matrix, Phishing Report,
 * Failed Login Summary, Shared MSP Hypothesis Board, Support Contract
 * Correlation, Client Support Ticket Index, Contracts Excerpts).
 *
 * Run: node backend/scripts/seed-packet-heist-drop4.js
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
   RestonIT Nexus Investigation questions (quiz)
───────────────────────────────────────────────────────────────────────────── */
const analysisQuestions = [
  {
    id: uuidv4(),
    stem: 'What does Command Post Bulletin 003 formally establish about RestonIT LLC?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'RestonIT and its employees have been confirmed as the intruders in all four matters' },
        { id: 'b', text: 'RestonIT appears in records connected to all four accounts later used by unknown intruders, and should now be treated as a shared MSP/access-custody lead' },
        { id: 'c', text: 'RestonIT has been formally cleared of any connection to the four intrusions' },
        { id: 'd', text: 'RestonIT is a victim of the same intruders who targeted the four businesses' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Bulletin 003 identifies RestonIT as connected to the lifecycle/support/credential custody of all four accounts and directs squads to treat it as a shared MSP/access-custody lead — not as a confirmed intruder or a cleared party.',
      incorrect: 'Review Bulletin 003’s "Important caution" and "Command Post Assessment" sections directly — neither confirms nor clears RestonIT; it elevates RestonIT to a shared lead requiring further investigation.',
      reference: 'Command Post Bulletin 003',
    },
  },
  {
    id: uuidv4(),
    stem: 'Command Post Bulletin 003 proves that RestonIT or a RestonIT employee conducted the four intrusions.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the Bulletin explicitly states current evidence does not prove RestonIT or any employee conducted the intrusions, only that RestonIT is connected to the accounts’ lifecycle/support/credential custody.',
      incorrect: 'Re-read the "Important caution" line in Bulletin 003 — it explicitly rules out treating this as proof of RestonIT’s involvement in the intrusions themselves.',
      reference: 'Command Post Bulletin 003',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which of the following are among Command Post’s seven priority investigative questions about RestonIT? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Who at RestonIT had access to credentials for the accounts used?' },
        { id: 'b', text: 'Were the accounts supposed to be disabled after project closeout?' },
        { id: 'c', text: 'Did any RestonIT employee intentionally create, retain, export, disclose, or sell access?' },
        { id: 'd', text: 'What is RestonIT’s annual revenue?' },
        { id: 'e', text: 'Were any RestonIT systems compromised?' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Credential access, closeout disablement, employee intent, and possible RestonIT system compromise are all listed priority questions. Revenue is not an investigative priority in the Bulletin.',
      incorrect: 'Review the seven priority questions in Bulletin 003 directly — financial performance is not among them.',
      reference: 'Command Post Bulletin 003',
    },
  },
  {
    id: uuidv4(),
    stem: 'Where is RestonIT LLC’s primary office physically located, per the Business Profile?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'A standalone office park unrelated to any of the four victims' },
        { id: 'b', text: 'Dogwood Enterprises Office Suites, Second Floor, Dogwood Hotel, Huntsville, Alabama' },
        { id: 'c', text: 'Inside Redstone Memorial Hospital’s administrative wing' },
        { id: 'd', text: 'A shared coworking space with CyberDyne Data Center' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'RestonIT’s primary office is on the second floor of the Dogwood Hotel — the same building whose second-floor network closet notes were accessed during the Dogwood intrusion.',
      incorrect: 'Check the Business Profile’s "Primary Office" field — RestonIT is physically headquartered inside Dogwood Hotel itself.',
      reference: 'RestonIT Business Profile',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which support contact email appears across all four victims’ Drop 1/3 support tickets and account creation records?',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['support@restit.example'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — support@restit.example is the common support contact observed across Redstone, Dogwood, CyberDyne, and Pixel Play’s records.',
      incorrect: 'The common support contact identified in the correlation is support@restit.example.',
      reference: 'RestonIT Support Contract Correlation',
    },
  },
  {
    id: uuidv4(),
    stem: 'Match each RestonIT employee to their role and primary responsibility.',
    payload: {
      kind: 'drag_match',
      sources: [
        { id: 'alex',   text: 'Alex Morgan Reston' },
        { id: 'sam',    text: 'Sam Smith' },
        { id: 'taylor', text: 'Taylor Brooks' },
      ],
      targets: [
        { id: 'owner',  text: 'Owner/Principal Consultant — credential management oversight, billing, contracts' },
        { id: 'tech',   text: 'IT Technician — help desk, remote support sessions, routine account setup' },
        { id: 'admin',  text: 'Administrative/Client Support Coordinator — scheduling, invoices, ticket intake, contracts' },
      ],
      matches: [
        { sourceId: 'alex',   targetId: 'owner' },
        { sourceId: 'sam',    targetId: 'tech' },
        { sourceId: 'taylor', targetId: 'admin' },
      ],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Alex Morgan Reston is the owner with credential oversight, Sam Smith is the technician who handles support sessions and account setup, and Taylor Brooks handles scheduling, invoices, and contract files.',
      incorrect: 'Review the Preliminary RestonIT Employee Matrix — each of the three named employees has a distinct role and access profile.',
      reference: 'Preliminary RestonIT Employee Matrix',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the Phishing Report show about RestonIT’s own support-related email addresses?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'They received multiple phishing messages between 2026-03-15 and 2026-03-22 impersonating billing portals and remote support platforms; clicks and credential submission are not confirmed' },
        { id: 'b', text: 'One employee is confirmed to have submitted their password to a phishing site' },
        { id: 'c', text: 'No phishing activity was observed against RestonIT at all' },
        { id: 'd', text: 'The phishing messages are confirmed to have originated from one of the four victims' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Multiple RestonIT support addresses were targeted with phishing between March 15-22, but neither clicks nor credential submission have been confirmed in current records.',
      incorrect: 'Check the "Known Clicks" and "Credential Submission" fields directly — both read "Not confirmed in current records."',
      reference: 'RestonIT Phishing Report',
    },
  },
  {
    id: uuidv4(),
    stem: 'The Failed Login Summary confirms a successful unauthorized login to support@restit.example from foreign VPN infrastructure.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the summary shows failed login attempts from foreign VPN infrastructure between March 18-20, but no successful login from those IPs was confirmed.',
      incorrect: 'Re-check the Failed Login Summary — it explicitly states no successful login from those IPs was confirmed.',
      reference: 'RestonIT Failed Login Summary',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which four hypotheses does the RestonIT Shared MSP Hypothesis Board present? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'RestonIT is an uninvolved common vendor with poor account closeout practices' },
        { id: 'b', text: 'RestonIT was compromised, and intruders obtained client credentials from RestonIT systems' },
        { id: 'c', text: 'RestonIT negligently retained credentials, exposed through poor controls' },
        { id: 'd', text: 'A RestonIT employee intentionally retained or supplied access to third parties' },
        { id: 'e', text: 'RestonIT is a front company for a foreign intelligence service' },
      ],
      correct: ['a', 'b', 'c', 'd'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The board presents exactly four hypotheses: uninvolved vendor, compromised MSP, negligent retention, and intentional insider. A foreign-intelligence front is not one of them and has no evidentiary basis.',
      incorrect: 'Review the Hypothesis Board’s four numbered hypotheses directly.',
      reference: 'RestonIT Shared MSP Hypothesis Board',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per each victim’s RestonIT contract excerpt, who bears contractual responsibility for safeguarding the credentials RestonIT received or maintained for support work?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Each victim organization is solely responsible' },
        { id: 'b', text: 'RestonIT LLC is responsible for safeguarding the credentials' },
        { id: 'c', text: 'No party is assigned responsibility in the contracts' },
        { id: 'd', text: 'A named third-party insurer is responsible' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Every contract excerpt (Redstone, Dogwood, CyberDyne, Pixel Play) states RestonIT is responsible for safeguarding credentials provided or maintained for support purposes.',
      incorrect: 'Check the "Credential Handling" clause in any of the four contract excerpts — it consistently assigns this duty to RestonIT.',
      reference: 'RestonIT Contracts Excerpts',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the same contracts, who retains ultimate authority to approve, disable, or modify accounts within each victim’s own environment?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'RestonIT LLC retains sole authority over all client accounts' },
        { id: 'b', text: 'Each victim organization retains that authority in its own environment' },
        { id: 'c', text: 'A joint RestonIT/victim committee must approve every change' },
        { id: 'd', text: 'The contracts do not address account authority at all' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Each contract states the victim organization retains authority over account creation/disablement in its own environment — even though RestonIT holds the credential-safeguarding duty. This is an important distinction: custody responsibility and operational authority sit with different parties.',
      incorrect: 'Check the "Access Terms" clause in the contract excerpts — account authority stays with each victim, separate from RestonIT’s credential-safeguarding duty.',
      reference: 'RestonIT Contracts Excerpts',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which record categories does the Draft Preservation Letter Categories memo identify as relevant to request from RestonIT? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'Credential management records (password vault entries, credential access logs, password reset records)' },
        { id: 'b', text: 'Remote support records (session logs, RMM records, technician audit logs)' },
        { id: 'c', text: 'Employee access logs for Alex Reston, Sam Smith, and Taylor Brooks' },
        { id: 'd', text: 'Each of the four victims’ customer payment card databases' },
        { id: 'e', text: 'Email and ticketing records involving support@restit.example and helpdesk@restit.example' },
      ],
      correct: ['a', 'b', 'c', 'e'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Credential management, remote support, employee access, and RestonIT email/ticketing records are all listed preservation categories. Victim payment card databases are not — that’s outside RestonIT’s own records and outside current scope.',
      incorrect: 'Review the nine numbered preservation categories directly — none of them reach into victim payment systems.',
      reference: 'Draft Preservation Letter Categories',
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Squad Deliverables (prompt-style, instructor-graded)
───────────────────────────────────────────────────────────────────────────── */
const deliverableQuestions = [
  {
    kind: 'prompt', points: 20,
    text: 'RestonIT Nexus Summary — Summarize what Command Post Bulletin 003 and the supporting RestonIT records establish about RestonIT LLC’s connection to the four intrusions. Be explicit about what is and is not established at this stage.',
    rubric: {
      keyElements: [
        'Names RestonIT LLC as the common MSP/support provider tied to all four compromised accounts',
        'Cites the common support contact (support@restit.example) and/or physical presence inside Dogwood Hotel as corroborating detail',
        'Explicitly states this does NOT establish RestonIT or an employee conducted the intrusions',
        'Frames RestonIT as a shared access-custody lead requiring further investigation, per Command Post’s own framing',
      ],
      commonErrors: ['Declaring RestonIT guilty of the intrusions', 'Omitting the explicit "does not prove" caveat', 'Failing to cite specific corroborating facts'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Employee & Access Custody Assessment — Using the Preliminary RestonIT Employee Matrix, assess which of the three named employees (Alex Morgan Reston, Sam Smith, Taylor Brooks) plausibly had access to the credentials for the four victim accounts, and why. What records would confirm or rule out each person’s access?',
    rubric: {
      keyElements: [
        'Correctly maps each employee’s role to their plausible credential access (Reston — oversight/senior access; Smith — hands-on support sessions/account setup; Brooks — contracts/scheduling, less direct technical access)',
        'Notes Sam Smith’s email (sam@restit.example) was among the phishing targets, and connects this to the technician’s hands-on account-setup role without over-concluding',
        'Identifies specific records that would confirm/rule out access (credential vault permissions, remote support session logs, ticket assignment history)',
        'Avoids naming any individual as the intruder or confirmed suspect',
      ],
      commonErrors: ['Naming a specific employee as the intruder', 'Ignoring role-based access differences between the three employees', 'Not identifying concrete follow-up records'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Compromise vs. Negligence Hypothesis Assessment — Using the RestonIT Shared MSP Hypothesis Board, the Phishing Report, and the Failed Login Summary, assess which of the four hypotheses (uninvolved vendor, compromised MSP, negligent custodian, intentional insider) is currently best supported. Explain your reasoning and what evidence would strengthen or weaken it.',
    rubric: {
      keyElements: [
        'Addresses at least the two most evidence-relevant hypotheses (compromised MSP and negligent custodian) using the phishing/failed-login leads and the closeout-review gaps',
        'Correctly notes phishing/failed-login activity keeps compromise "viable" but does NOT confirm it',
        'Notes the negligent-custodian hypothesis is supported by consistent closeout/review gaps across all four victim tickets, independent of the compromise question',
        'Uses hedged, non-definitive language and identifies what would move the needle (e.g., RestonIT credential vault logs, endpoint forensics, confirmed phishing click/credential entry)',
      ],
      commonErrors: ['Declaring a hypothesis confirmed', 'Ignoring the negligent-custodian hypothesis in favor of only the more dramatic compromise theory', 'Not identifying what evidence would change the assessment'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Contractual Responsibility Analysis — Using the RestonIT Contracts Excerpts, explain the distinction between RestonIT’s contractual duty to safeguard credentials and each victim’s retained authority to approve/disable accounts in its own environment. Why does this distinction matter for how your squad scopes its investigative and records requests?',
    rubric: {
      keyElements: [
        'Correctly states RestonIT bears the credential-safeguarding duty in all four contracts',
        'Correctly states each victim retains account-approval/disablement authority in its own environment',
        'Explains why this split matters: it means both RestonIT (credential custody) and the victim (closeout review failure) may bear investigative-relevant responsibility, not just one party',
        'Connects this to why preservation requests target both RestonIT records and victim-side account review documentation',
      ],
      commonErrors: ['Treating credential custody and account authority as the same thing', 'Concluding this establishes legal liability rather than investigative scope', 'Only addressing one victim’s contract instead of the pattern across all four'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Preservation & Records Request Plan — Using the Draft Preservation Letter Categories, draft your squad’s actual preservation/records request list for RestonIT LLC. For each category you include, state the specific fact you are trying to establish or rule out.',
    rubric: {
      keyElements: [
        'Selects specific categories from the real preservation memo (credential management records, remote support/RMM records, employee access logs, email/ticketing records) rather than inventing new ones',
        'Each request is tied to a specific investigative question (e.g., credential vault logs → who had access to which client’s credentials and when)',
        'Includes at least one employee-specific access log request tied to the phishing/failed-login lead',
        'Notes this is a planning document, not a completed legal instrument, and identifies the factual basis for each category as instructed'
      ],
      commonErrors: ['Requesting categories not grounded in the actual memo', 'No stated investigative question per request', 'Omitting employee-specific access log requests'],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Main
───────────────────────────────────────────────────────────────────────────── */
(async () => {
  await seq.authenticate();
  console.log('PostgreSQL connected\n');

  const analysisTitle    = 'PACKET HEIST — Drop 4: RestonIT Nexus Investigation';
  const deliverableTitle = 'PACKET HEIST — Drop 4: Squad Deliverables';

  await seq.query(
    `DELETE FROM assignments WHERE course_id = :courseId AND scenario_name = 'packet-heist' AND drop_number = 4 AND title IN (:t1, :t2)`,
    { replacements: { courseId: COURSE_ID, t1: analysisTitle, t2: deliverableTitle } },
  );
  console.log('Cleared previous Drop 4 seed (if any)\n');

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
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', 'squad', :maxScore, :oi,
        false, 'packet-heist', 4, :questions, '{}', NOW(), NOW())`,
    {
      replacements: {
        id:          quizId,
        courseId:    COURSE_ID,
        title:       analysisTitle,
        description: 'Command Post Bulletin 003 formally identifies RestonIT LLC as the shared MSP behind all four victim accounts. Review RestonIT’s business profile, employee matrix, contracts, and the compromise/negligence leads, then answer each question based strictly on what the evidence supports.',
        maxScore,
        oi,
        questions:   JSON.stringify(analysisQuestions),
      },
    },
  );
  console.log(`✓ RestonIT Nexus Investigation — ID: ${quizId} | ${analysisQuestions.length} questions | ${maxScore} pts`);

  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', 'squad', 100, :oi2,
        false, 'packet-heist', 4, :questions, '{}', NOW(), NOW())`,
    {
      replacements: {
        id:       delivId,
        courseId: COURSE_ID,
        title:    deliverableTitle,
        description: [
          'PACKET HEIST · Drop 4 — RestonIT Nexus Investigation',
          '',
          'Complete all five deliverables as a squad, turning your investigation onto RestonIT LLC itself.',
          'Your responses will be reviewed and graded by command. Base every response on evidence in the',
          'Drop 4 RestonIT packet — business profile, employee matrix, contracts, and hypothesis board.',
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
