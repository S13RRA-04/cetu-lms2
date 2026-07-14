'use strict';
/**
 * Seed PACKET HEIST — Drop 4 role-based tasking, from the shared
 * "Role-Based Tasking.pdf" (Day 2, Subject: RestonIT Shared MSP
 * Correlation). Each of the eight professional-role lanes gets a distinct
 * single-paragraph RestonIT-focused task. One assignment per role, gated
 * via role_filters, individually graded.
 *
 * Source: scenarios/PACKET HEIST/Drop 4/PDFs/Role-Based Tasking.pdf
 *
 * Run: node backend/scripts/seed-packet-heist-drop4-role-tasking.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP      = 4;

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

const ROLES = [
  {
    value: 'supervisory_special_agent',
    label: 'Squad Lead / Acting SSA',
    task: 'Determine whether RestonIT should be treated as a witness, victim, negligent access custodian, compromised MSP, or subject lead. State what evidence supports and contradicts each option.',
    keyElements: [
      'Addresses all five framings (witness, victim, negligent custodian, compromised MSP, subject lead)',
      'Cites specific supporting evidence for the framing(s) it favors',
      'Cites specific contradicting evidence',
      'Does not commit to a single conclusion without hedging',
    ],
  },
  {
    value: 'special_agent',
    label: 'Case Agent',
    task: 'Prepare an investigative process recommendation for RestonIT records. Identify what can be obtained through consent, preservation, subpoena, or search warrant, and what facts support each step.',
    keyElements: [
      'Addresses all four process types (consent, preservation, subpoena, search warrant)',
      'Ties each process type to what records it would obtain',
      'States the factual basis supporting each recommended step',
    ],
  },
  {
    value: 'cyber_analyst',
    label: 'Cyber Analyst',
    task: 'Identify what RestonIT-side technical records are needed to determine whether the victim accounts were accessed, stored, exported, or used through RestonIT systems.',
    keyElements: [
      'Names specific technical record types (credential vault logs, remote session logs, endpoint logs)',
      'Ties each record type to a specific question (accessed/stored/exported/used through RestonIT systems)',
    ],
  },
  {
    value: 'operational_support_da',
    label: 'Data Analyst',
    task: 'Build a RestonIT relationship table showing clients, accounts, support tickets, account creation dates, last approved use, incident use, and unresolved account closeout issues.',
    keyElements: [
      'Table includes all four victim clients',
      'Table includes each required field (accounts, tickets, creation dates, last approved use, incident use, closeout issues)',
      'Data is drawn from the actual RestonIT records already gathered, not invented',
    ],
  },
  {
    value: 'intelligence_analyst',
    label: 'Intelligence Analyst',
    task: 'Update the hypothesis board. Assess whether the current evidence supports poor hygiene, MSP compromise, negligent access handling, or intentional supply of access. Use confidence language.',
    keyElements: [
      'Addresses all four hypotheses from the Shared MSP Hypothesis Board',
      'Uses explicit confidence language (low/moderate/high) per hypothesis',
      'Ties assessment to specific evidence already gathered (phishing report, failed login summary, closeout gaps)',
    ],
  },
  {
    value: 'operational_support_sos',
    label: 'SOS / Case Coordinator',
    task: 'Update the master evidence index, lead tracker, and open-items list. Separate evidence proving RestonIT’s legitimate support role from evidence needed to prove misuse or intent.',
    keyElements: [
      'Evidence index and lead tracker are both updated/represented',
      'Clearly separates "proves legitimate support role" evidence from "needed to prove misuse/intent" evidence',
    ],
  },
  {
    value: 'task_force_officer',
    label: 'TFO / Field Lead',
    task: 'Identify interviews and business records needed from RestonIT, victims, and vendors. Identify office location, records custodians, and possible employee roles.',
    keyElements: [
      'Names specific interview targets among RestonIT’s three named employees',
      'Identifies RestonIT’s office location (Dogwood Hotel, second floor)',
      'Identifies records custodians and business records needed',
    ],
  },
  {
    value: 'digital_evidence_lead',
    label: 'Digital Evidence Lead / CART Liaison',
    task: 'Identify what RestonIT systems should be preserved if authority is obtained, including technician workstations, support mailboxes, ticketing, credential storage, remote support logs, client documentation, and backups.',
    keyElements: [
      'Names each of the seven listed system/record categories',
      'Frames this as preservation contingent on obtaining authority (not immediate seizure)',
    ],
  },
];

function buildQuestion(role) {
  return {
    kind: 'prompt',
    points: 30,
    text: `${role.label} — RestonIT Shared MSP Correlation Tasking\n\n${role.task}`,
    rubric: {
      keyElements: role.keyElements,
      commonErrors: [
        'Declaring RestonIT confirmed guilty or confirmed cleared rather than using hedged, evidence-based language',
        'Ignoring the RestonIT-specific records already gathered in favor of generic answers',
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
  console.log('Cleared previous Drop 4 role-tasking seed (if any)\n');

  const [[{ next: oi0 }]] = await seq.query(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
    { replacements: { courseId: COURSE_ID } },
  );
  let oi = Number(oi0);

  for (const role of ROLES) {
    const id       = uuidv4();
    const title    = `PACKET HEIST — Drop 4: Role Tasking — ${role.label}`;
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
          description: `Individual role tasking for the ${role.label} lane, per the Drop 4 Role-Based Tasking directive (Subject: RestonIT Shared MSP Correlation).`,
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
