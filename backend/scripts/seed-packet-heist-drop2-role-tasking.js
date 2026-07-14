'use strict';
/**
 * Seed PACKET HEIST — Drop 2 role-based tasking, from the shared
 * "Role-Based Correlation Tasking.md" document (one shared doc, not
 * per-victim). Each of the eight professional-role lanes gets a distinct
 * single-paragraph cross-victim correlation task. One assignment per role,
 * gated via role_filters, individually graded.
 *
 * Source: scenarios/PACKET HEIST/Drop 2/Role-Based Correlation Tasking.md
 *
 * Run: node backend/scripts/seed-packet-heist-drop2-role-tasking.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP      = 2;

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

const ROLES = [
  {
    value: 'supervisory_special_agent',
    label: 'Squad Lead / Acting SSA',
    task: 'Determine whether the squad assesses these incidents as unrelated, related, or unresolved. Identify the strongest evidence for and against linkage. Identify the risk of overstatement.',
    keyElements: [
      'States a clear position: unrelated, related, or unresolved',
      'Cites specific strongest evidence for linkage',
      'Cites specific strongest evidence against linkage',
      'Names the risk of overstating the connection at this stage',
    ],
  },
  {
    value: 'special_agent',
    label: 'Case Agent',
    task: 'Identify what investigative process is needed to determine account ownership, account creation history, credential custody, and whether the same third-party support provider may be connected to account lifecycle records.',
    keyElements: [
      'Identifies specific investigative process (consent, preservation, subpoena, records request)',
      'Ties the process to account ownership/creation history/credential custody questions',
      'Addresses the possibility of a shared third-party support provider',
    ],
  },
  {
    value: 'cyber_analyst',
    label: 'Cyber Analyst',
    task: 'Compare observed behaviors across victims. Identify similarities and differences in tactics, techniques, and procedures. Do not over-attribute based on infrastructure alone.',
    keyElements: [
      'Identifies specific TTP similarities across at least two victims',
      'Identifies specific TTP differences across victims',
      'Explicitly avoids attributing to a single actor based on infrastructure alone',
    ],
  },
  {
    value: 'operational_support_da',
    label: 'Data Analyst',
    task: 'Build a normalized cross-victim table with account names, account creation dates, incident dates, source IPs, affected systems, account purpose, and access-enabling artifacts.',
    keyElements: [
      'Table includes all four victims',
      'Table includes each required field (account name, creation date, incident date, source IP, affected system, account purpose, access-enabling artifact)',
      'Data is drawn from the actual Drop 1/2 evidence, not invented',
    ],
  },
  {
    value: 'intelligence_analyst',
    label: 'Intelligence Analyst',
    task: 'Develop at least three hypotheses explaining the pattern: (1) separate unrelated intrusions, (2) same hands-on-keyboard actor, (3) different intruders using access from a common upstream source. Assess evidence supporting and contradicting each.',
    keyElements: [
      'Addresses all three named hypotheses',
      'Provides supporting evidence for each',
      'Provides contradicting evidence for each',
      'Does not declare one hypothesis confirmed',
    ],
  },
  {
    value: 'operational_support_sos',
    label: 'SOS / Case Coordinator',
    task: 'Create a master evidence index and lead tracker for the squad. Track which facts are proven, which are inferred, and which are unknown.',
    keyElements: [
      'Evidence index covers all four victims',
      'Lead tracker has owner/priority/status fields',
      'Clearly separates proven vs. inferred vs. unknown facts',
    ],
  },
  {
    value: 'task_force_officer',
    label: 'TFO / Field Lead',
    task: 'Identify victim-side business records needed to resolve account ownership, including vendor lists, contracts, maintenance tickets, access approval records, and employee/vendor interviews.',
    keyElements: [
      'Names specific record categories (vendor lists, contracts, maintenance tickets, access approval records)',
      'Identifies specific interview targets (employees and/or vendor contacts)',
      'Ties each request to the account-ownership question',
    ],
  },
  {
    value: 'digital_evidence_lead',
    label: 'Digital Evidence Lead / CART Liaison',
    task: 'Identify evidence that must be preserved immediately across victims, including logs, account metadata, token/API key usage records, affected host images, portal exports, and external connection records.',
    keyElements: [
      'Names specific evidence categories (logs, account metadata, token/API key usage, host images, portal exports, external connections)',
      'Frames these as immediate/time-sensitive preservation needs',
      'Covers evidence across multiple victims, not just one',
    ],
  },
];

function buildQuestion(role) {
  return {
    kind: 'prompt',
    points: 30,
    text: `${role.label} — Cross-Victim Correlation Tasking\n\n${role.task}`,
    rubric: {
      keyElements: role.keyElements,
      commonErrors: [
        'Treating the four incidents as definitively linked or definitively unrelated without hedged, evidence-based language',
        'Ignoring the cross-victim comparison and analyzing only one victim',
      ],
    },
  };
}

(async () => {
  await seq.authenticate();
  console.log('PostgreSQL connected\n');

  await seq.query(
    `DELETE FROM assignments WHERE course_id = :courseId AND scenario_name = 'packet-heist' AND drop_number = :drop AND title LIKE 'PACKET HEIST — Drop ' || :drop || ': Role Tasking — %'`,
    { replacements: { courseId: COURSE_ID, drop: DROP } },
  );
  console.log('Cleared previous Drop 2 role-tasking seed (if any)\n');

  const [[{ next: oi0 }]] = await seq.query(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
    { replacements: { courseId: COURSE_ID } },
  );
  let oi = Number(oi0);

  for (const role of ROLES) {
    const id       = uuidv4();
    const title    = `PACKET HEIST — Drop 2: Role Tasking — ${role.label}`;
    const question = buildQuestion(role);

    await seq.query(
      `INSERT INTO assignments
         (id, course_id, title, description, type, grading_mode, max_score, order_index,
          is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'challenge', 'individual', :maxScore, :oi,
          false, 'packet-heist', :drop, :questions, ARRAY[:role]::text[], NOW(), NOW())`,
      {
        replacements: {
          id, courseId: COURSE_ID, title,
          description: `Individual role tasking for the ${role.label} lane, per the Drop 2 Role-Based Correlation Tasking directive.`,
          maxScore:  question.points,
          oi:        oi++,
          drop:      DROP,
          questions: JSON.stringify([question]),
          role:      role.value,
        },
      },
    );
    console.log(`✓ ${title} — role_filters: [${role.value}]`);
  }

  console.log('\nAll 8 role-tasking rows seeded unpublished. Assign per squad and unlock via Command → Content Gating when ready.\n');
  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
