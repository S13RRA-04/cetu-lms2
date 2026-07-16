'use strict';
/**
 * Seed PACKET HEIST — Drop 7 role-based tasking, from the financial/crypto
 * legal process packet (BHX Escrow Wallet Cluster Analysis, Vertex Digital
 * Assets KYC/Subpoena Return, Foreign Partner Financial Intelligence Return,
 * Reston-Rogov Escrow Negotiation Correlation Memo, Conspiracy Elements
 * Assessment Worksheet). Each of the ten professional-role lanes gets a
 * distinct single-prompt task. One assignment per role, gated via
 * role_filters, individually graded.
 *
 * The Forensic Accountant row is also gated on the 'crypto_forensics'
 * certification (see backend/src/services/assignment.service.js's
 * _queryListForStudent, which OR-matches role_filters against both
 * professional_role and certifications) — so it reaches Forensic Accountants
 * by role, and anyone else who holds cryptocurrency-forensics training,
 * regardless of their base role. All other roles keep their own distinct
 * tasking (no crypto content duplicated into them).
 *
 * Source: scenarios/PACKET HEIST/Drop 7/PDFs/*.pdf
 *
 * Run: node backend/scripts/seed-packet-heist-drop7-role-tasking.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 7;

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

const ROLES = [
  {
    value: 'supervisory_special_agent',
    label: 'Squad Lead / Acting SSA',
    roleFilters: ['supervisory_special_agent'],
    task: 'Prepare a squad briefing recommendation on whether the Drop 7 financial/crypto packet changes investigative priorities. Decide whether to prioritize pursuing full foreign banking records (MLAT) or a domestic Reston interview next, and justify the call.',
    keyElements: [
      'States a clear next-priority recommendation (MLAT for banking records vs. Reston interview, or a sequenced combination)',
      'Cites specific Drop 7 findings supporting the recommendation',
      'Acknowledges the tradeoffs/risks of the chosen sequencing',
    ],
  },
  {
    value: 'special_agent',
    label: 'Case Agent',
    roleFilters: ['special_agent'],
    task: 'Prepare an investigative process recommendation for the financial evidence gap. Identify what legal process (MLAT request, subpoena to Coinquest, subpoena to Vertex for full transaction history) is still needed, and what specific fact each would resolve.',
    keyElements: [
      'Names at least three distinct legal-process steps still needed',
      'Ties each step to the specific gap it would close (per the Vertex return\'s and Foreign Partner return\'s stated limitations)',
      'Does not re-request records already obtained in this packet',
    ],
  },
  {
    value: 'cyber_analyst',
    label: 'Cyber Analyst',
    roleFilters: ['cyber_analyst'],
    task: 'Critique the BHX Escrow Wallet Cluster Analysis methodology. Identify the specific clustering heuristics used, their known limitations, and what additional technical work would raise confidence in the Wallet A / Wallet B attribution.',
    keyElements: [
      'Names the specific heuristics used (common-input-ownership, change-address detection)',
      'States the specific limitation the report itself flags (probabilistic, not absolute, attribution; possible shared-processor mis-grouping)',
      'Recommends a concrete next technical step',
    ],
  },
  {
    value: 'operational_support_da',
    label: 'Data Analyst',
    roleFilters: ['operational_support_da'],
    task: 'Build a financial-flow table connecting the four victim sales, the BHX escrow wallet, the Wallet A / Wallet B outbound split, and the known Coinquest cashouts. Include dates and approximate values where available.',
    keyElements: [
      'Table includes all four victim sales as rows',
      'Table shows the escrow wallet, Wallet A, and Wallet B as connected columns/stages',
      'Includes the two known Coinquest cashout dates/amounts from Drop 6',
      'Data is drawn from the actual Drop 7 documents, not invented',
    ],
  },
  {
    value: 'intelligence_analyst',
    label: 'Intelligence Analyst',
    roleFilters: ['intelligence_analyst'],
    task: 'Update the confidence assessment on Mikhail Rogov. Using the Foreign Partner Financial Intelligence Return\'s own framing, separately assess confidence that Rogov is (a) financially linked to the escrow proceeds and (b) personally the BRKR_RU forum operator.',
    keyElements: [
      'Assesses (a) and (b) separately with distinct confidence levels',
      'Uses explicit confidence language (low/moderate/high)',
      'Grounds each assessment in specific cited evidence',
    ],
  },
  {
    value: 'operational_support_sos',
    label: 'SOS / Case Coordinator',
    roleFilters: ['operational_support_sos'],
    task: 'Update the master evidence index and lead tracker for the Drop 7 packet. Separate what is now established from what remains an open lead requiring further legal process.',
    keyElements: [
      'Evidence index reflects all five new Drop 7 documents',
      'Clearly separates "established" facts from "open lead" items',
      'Open-lead items match the specific gaps stated in the source documents (not invented ones)',
    ],
  },
  {
    value: 'task_force_officer',
    label: 'TFO / Field Lead',
    roleFilters: ['task_force_officer'],
    task: 'Draft a foreign-partner liaison strategy for further engagement regarding Mikhail Rogov, given the partner\'s stated cooperation limits (no extradition treaty covering these offenses, willingness to consider an MLAT request).',
    keyElements: [
      'Explicitly accounts for the no-extradition-treaty limitation',
      'Proposes realistic next liaison steps within the partner\'s stated willingness (e.g. MLAT request for banking records)',
      'Does not propose steps the partner has already declined or cannot legally support',
    ],
  },
  {
    value: 'digital_evidence_lead',
    label: 'Digital Evidence Lead / CART Liaison',
    roleFilters: ['digital_evidence_lead'],
    task: 'Identify what additional digital/financial evidence should be preserved or formally requested following the Drop 7 returns (e.g. full Vertex transaction-monitoring logs, downstream banking records), and how chain-of-custody documentation should treat blockchain analysis output differently from a standard forensic image.',
    keyElements: [
      'Names specific additional records to preserve/request beyond what Vertex already produced',
      'Addresses how blockchain analysis output (probabilistic clustering) should be documented differently than a bit-for-bit forensic image',
    ],
  },
  {
    value: 'supervisory_intelligence_analyst',
    label: 'Supervisory Intelligence Analyst',
    roleFilters: ['supervisory_intelligence_analyst'],
    task: 'Conduct a senior review of the Drop 7 intelligence assessment. Evaluate whether the "moderate-to-high confidence financial link / lower confidence forum operator" framing in the Foreign Partner Financial Intelligence Return is well-supported, and identify any analytic gaps.',
    keyElements: [
      'Directly evaluates the stated confidence framing rather than restating it uncritically',
      'Identifies at least one genuine analytic gap or alternative explanation',
      'Recommends what would resolve the identified gap',
    ],
  },
  {
    value: 'forensic_accountant',
    label: 'Forensic Accountant',
    roleFilters: ['forensic_accountant', 'crypto_forensics'],
    task: 'Conduct the financial-forensic deep dive. Critique the escrow wallet cluster analysis\'s clustering methodology and confidence limits, evaluate the precision (or imprecision) of the Wallet A / Coinquest cashout correlation, assess the structuring indicator in the two sub-$10,000 cashouts, and recommend the specific additional financial-forensic legal process needed to move this from circumstantial to prosecutable.',
    keyElements: [
      'Critiques the clustering methodology and states its confidence limits accurately',
      'Evaluates the Wallet A / Coinquest correlation\'s precision, using the same hedged language the source memo uses',
      'Addresses the CTR-structuring indicator specifically',
      'Recommends concrete next financial-forensic legal process (e.g. MLAT for full banking records, Vertex transaction-monitoring logs)',
    ],
  },
];

function buildQuestion(role) {
  return {
    kind: 'prompt',
    points: 30,
    text: `${role.label} — Drop 7 Financial & Cryptocurrency Conspiracy Tasking\n\n${role.task}`,
    rubric: {
      keyElements: role.keyElements,
      commonErrors: [
        'Declaring Mikhail Rogov conclusively identified as BRKR_RU rather than distinguishing financial linkage from forum-operator identification',
        'Treating the escrow wallet cluster analysis as absolute proof rather than probabilistic attribution',
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
  console.log('Cleared previous Drop 7 role-tasking seed (if any)\n');

  const [[{ next: oi0 }]] = await seq.query(
    "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
    { replacements: { courseId: COURSE_ID } },
  );
  let oi = Number(oi0);

  for (const role of ROLES) {
    const id = uuidv4();
    const title = `PACKET HEIST — Drop 7: Role Tasking — ${role.label}`;
    const question = buildQuestion(role);

    // Named array replacements don't expand into an ARRAY[...] literal the
    // way they do into an IN-list, so build the placeholder list explicitly
    // (supports the two-value Forensic Accountant role_filters as well as
    // the single-value rows).
    const arrayPlaceholders = role.roleFilters.map((_, i) => `:rf${i}`).join(', ');
    const arrayReplacements = Object.fromEntries(role.roleFilters.map((v, i) => [`rf${i}`, v]));

    await seq.query(
      `INSERT INTO assignments
         (id, course_id, title, description, type, grading_mode, max_score, order_index,
          is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'challenge', 'individual', :maxScore, :oi,
          false, 'packet-heist', :drop, :questions, ARRAY[${arrayPlaceholders}]::text[], NOW(), NOW())`,
      {
        replacements: {
          id, courseId: COURSE_ID, title,
          description: `Individual role tasking for the ${role.label} lane, per the Drop 7 financial/cryptocurrency legal process packet.`,
          maxScore: question.points,
          oi: oi++,
          drop: DROP,
          questions: JSON.stringify([question]),
          ...arrayReplacements,
        },
      },
    );
    console.log(`✓ ${title} — role_filters: [${role.roleFilters.join(', ')}]`);
  }

  console.log('\nAll 10 role-tasking rows seeded unpublished. Assign per squad and unlock via Command → Content Gating when ready.\n');
  await seq.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
