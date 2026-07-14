'use strict';
/**
 * Seed PACKET HEIST — Drop 1 role-based tasking. Each squad member's
 * "Student-Facing Tasking.md" (identical Required Output template across all
 * four victims — Redstone Memorial, Dogwood Hotel, CyberDyne, Pixel Play,
 * confirmed byte-identical from "## Squad Lead / Acting SSA" onward) assigns
 * a distinct six-field output to each of the eight professional-role lanes.
 * This creates ONE assignment per role, gated via role_filters so a student
 * only ever sees their own lane's tasking — individually graded, since this
 * is a personal role output rather than a squad-consensus deliverable.
 *
 * Source: scenarios/PACKET HEIST/Drop 1/<Victim>/Student-Facing Tasking.md
 * (role sections, victim-agnostic).
 *
 * Run: node backend/scripts/seed-packet-heist-drop1-role-tasking.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID  = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP       = 1;

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect:        'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging:        false,
});

const ROLES = [
  {
    value: 'supervisory_special_agent',
    label: 'Squad Lead / Acting SSA',
    responsibility: 'Keep the squad focused, assign work, manage time, challenge assumptions, and prepare the Command Post briefing.',
    fields: [
      'Current Squad Assessment — one-paragraph summary of what happened.',
      'Confidence Level — Low / Moderate / High.',
      'Basis for Confidence — what evidence supports the assessment?',
      'Key Unknowns — list the top unresolved issues.',
      'Risk of Overstatement — what should the squad avoid claiming?',
      'Recommended Next Step — what should Command Post authorize or return next?',
    ],
  },
  {
    value: 'special_agent',
    label: 'Case Agent',
    responsibility: 'Determine investigative predication, victim impact, legal/investigative next steps, and what records should be requested.',
    fields: [
      'Investigative Predication — what makes this a legitimate investigative matter?',
      'Victim Impact — what is known, what is not known, and what is explicitly not impacted?',
      'Unauthorized Conduct — what conduct appears unauthorized?',
      'Immediate Preservation Needs — what evidence should be preserved now?',
      'Recommended Legal / Investigative Process — consent request, subpoena, preservation letter, interview, logs, etc.',
      'Interview Follow-Up — top questions for the victim or vendor/account owner.',
    ],
  },
  {
    value: 'cyber_analyst',
    label: 'Cyber Analyst',
    responsibility: 'Analyze technical activity, IOCs, observed behavior, and possible TTPs without over-attributing.',
    fields: [
      'Technical Summary — what happened technically?',
      'Observed IOCs — accounts, IPs, hosts, files, scripts, tokens, API keys, processes.',
      'Observed Behaviors — discovery, persistence, credential use, API abuse, remote access, etc.',
      'Possible MITRE ATT&CK Mapping — technique names/IDs if known, with confidence.',
      'Technical Gaps — what additional logs or telemetry are needed?',
      'Technical Assessment — what does the activity suggest, without naming a suspect?',
    ],
  },
  {
    value: 'operational_support_da',
    label: 'Data Analyst',
    responsibility: 'Normalize the timeline, structure the evidence, correlate entities, and identify data gaps.',
    fields: [
      'Normalized Timeline — chronological event list using a consistent time format.',
      'Entity Table — accounts, hosts, IPs, files, users, tokens, systems.',
      'Source Data Quality — which records are reliable, incomplete, victim-generated, or need validation?',
      'Correlation Opportunities — what fields could be compared across other squads?',
      'Data Gaps — what logs or exports are missing?',
      'Priority Data Request — one dataset that would most improve the investigation.',
    ],
  },
  {
    value: 'intelligence_analyst',
    label: 'Intelligence Analyst',
    responsibility: 'Develop initial hypotheses, identify intelligence gaps, and prevent premature attribution.',
    fields: [
      'Initial Hypotheses — 2-3 possible explanations for the activity.',
      'Supporting Evidence — evidence that supports each hypothesis.',
      'Contradicting / Missing Evidence — what weakens each hypothesis?',
      'Intelligence Gaps — what must be learned before attribution?',
      'Confidence Statement — Low / moderate / high confidence, with reason.',
      'Alternative Explanations — credential theft, abandoned vendor account, insider misuse, third-party compromise, etc.',
    ],
  },
  {
    value: 'operational_support_sos',
    label: 'SOS / Case Coordinator',
    responsibility: 'Maintain the squad’s case organization, evidence index, lead tracker, and briefing hygiene.',
    fields: [
      'Evidence Index — list all artifacts received and what each proves.',
      'Lead Tracker — lead, owner, priority, status, requested return.',
      'Open Questions List — unresolved issues requiring Command Post or victim follow-up.',
      'Preservation Checklist — systems, logs, files, accounts, screenshots, exports.',
      'Briefing Packet Status — what is ready, what is missing, what needs cleanup?',
      'Contradiction / Ambiguity Log — anything that does not line up or needs clarification.',
    ],
  },
  {
    value: 'task_force_officer',
    label: 'TFO / Field Lead',
    responsibility: 'Identify physical-world, local, victim, vendor, and records-based follow-up leads.',
    fields: [
      'Local Follow-Up Leads — people, places, vendors, systems, records.',
      'Victim-Side Records Needed — access logs, badge logs, vendor lists, contracts, support tickets.',
      'Interview Targets — victim employees, IT staff, vendor contacts, system owners.',
      'Physical / Location Relevance — any location-specific records or facilities issues.',
      'Jurisdiction / Partner Considerations — local PD, state agency, payment processor, hospital admin, etc.',
      'Immediate Field Recommendation — most useful non-technical follow-up.',
    ],
  },
  {
    value: 'digital_evidence_lead',
    label: 'Digital Evidence Lead / CART Liaison',
    responsibility: 'Identify what digital evidence should be preserved, collected, imaged, or requested without contaminating it.',
    fields: [
      'Evidence Preservation Priorities — systems, logs, files, accounts, exports, snapshots.',
      'Collection Method Recommendation — consent collection, forensic image, log export, screenshot, hash, etc.',
      'Volatile / Time-Sensitive Evidence — session logs, token/API key usage, firewall logs, EDR telemetry.',
      'Integrity Concerns — what has been disabled, isolated, altered, or reviewed by the victim?',
      'Evidence Handling Notes — what should not be wiped, reimaged, or modified?',
      'Next Digital Evidence Request — most important artifact to obtain next.',
    ],
  },
];

function buildQuestion(role) {
  return {
    kind: 'prompt',
    points: 60,
    text: [
      `${role.label} — Required Output`,
      '',
      `Primary Responsibility: ${role.responsibility}`,
      '',
      'Produce your role\'s required output for your squad\'s victim, based on the Drop 1 evidence package:',
      ...role.fields.map((f, i) => `${i + 1}. ${f}`),
    ].join('\n'),
    rubric: {
      keyElements: role.fields.map((f) => `Addresses "${f.split(' — ')[0]}" with a specific, evidence-grounded answer`),
      commonErrors: [
        'Vague or generic answers not tied to specific evidence in the victim\'s Drop 1 package',
        'Overstating confidence or naming a suspect where the evidence does not support it',
        'Skipping one or more of the six required output fields',
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
  console.log('Cleared previous Drop 1 role-tasking seed (if any)\n');

  const [[{ next: oi0 }]] = await seq.query(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
    { replacements: { courseId: COURSE_ID } },
  );
  let oi = Number(oi0);

  for (const role of ROLES) {
    const id       = uuidv4();
    const title    = `PACKET HEIST — Drop 1: Role Tasking — ${role.label}`;
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
          description: `Individual role tasking for the ${role.label} lane. Your squad's Drop 1 evidence package is the source of truth — answer strictly from what it establishes.`,
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
