'use strict';
/**
 * Seed PACKET HEIST Drop 7 applied professional-role assignments and
 * supplemental certification assignments. Each assignment contains one
 * work product and two evidence-based judgment checks.
 *
 * Professional roles and certifications are deliberately separate:
 * - cyber analysis is part of the Intelligence Analyst product;
 * - SOS is the professional role (case coordination is its function);
 * - digital-evidence and cryptocurrency expertise are certification tasking.
 *
 * Run: node backend/scripts/seed-packet-heist-drop7-role-tasking.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 7;
const SCENARIO = 'packet-heist';
const TITLE_PREFIX = 'PACKET HEIST - Drop 7:';

const commonErrors = [
  'Declaring Mikhail Rogov conclusively identified as BRKR_RU instead of separating financial linkage from identity attribution',
  'Treating probabilistic wallet clustering as absolute proof',
  'Inventing facts or claiming records were obtained when the packet identifies them as outstanding',
];

const PROFESSIONAL_ASSIGNMENTS = [
  {
    key: 'supervisory_special_agent',
    label: 'Squad Lead / Acting SSA',
    filters: ['supervisory_special_agent'],
    task: 'Prepare a one-page decision brief that selects and sequences the squad\'s next investigative action. Compare an MLAT for downstream banking records, a domestic Reston interview, and additional technical attribution work; then recommend the first action and define the decision risk.',
    keyElements: ['Makes a clear first-action recommendation', 'Compares the operational value and risk of at least two paths', 'Uses specific Drop 7 findings', 'Defines what result would cause the squad to change course'],
    checks: [
      ['Which recommendation is most defensible from the current record?', ['Sequence the highest-value step and explain what gap it closes', 'Pursue every possible step without prioritization', 'Treat Rogov\'s identity as conclusively established', 'Close the investigation because financial linkage exists'], 0, 'Command Post Bulletin 006 and Drop 7 source limitations'],
      ['What is the principal leadership risk in choosing a Reston interview before preserving or obtaining outstanding records?', ['The interview may alert subjects and affect evidence or coordination opportunities', 'Interviews are never lawful in financial investigations', 'The foreign partner has already extradited Rogov', 'Vertex has no relevant records'], 0, 'Drop 7 legal-process and cooperation limitations'],
    ],
  },
  {
    key: 'special_agent',
    label: 'Case Agent',
    filters: ['special_agent'],
    task: 'Build a legal-process plan. For each proposed MLAT, subpoena, interview, or preservation request, identify the custodian or recipient, the exact evidence sought, the factual gap it would address, and the order in which it should be pursued.',
    keyElements: ['Identifies at least three concrete investigative or legal-process steps', 'Maps every step to a specific evidence gap', 'Does not re-request material already produced', 'Prioritizes the steps and explains sequencing'],
    checks: [
      ['Which process is needed for Rogov\'s full downstream foreign banking records?', ['An MLAT or other applicable foreign legal-assistance process', 'A duplicate request for the same limited Vertex return', 'A local consent search of RestonIT', 'No additional process'], 0, 'Vertex Digital Assets KYC and Subpoena Return'],
      ['Which request most directly tests whether Rogov personally operated BRKR_RU?', ['Records or communications tying Rogov to the forum persona and account access', 'Another copy of the existing KYC identity page', 'Only the four victim sale totals', 'A summary of RestonIT contracts'], 0, 'Foreign Partner Financial Intelligence Return'],
    ],
  },
  {
    key: 'intelligence_analyst',
    label: 'Intelligence Analyst',
    filters: ['intelligence_analyst'],
    task: 'Produce a dissemination-ready intelligence assessment for U.S. Intelligence Community and authorized foreign-partner audiences. Evaluate the wallet-clustering methodology, separately assess Rogov\'s financial linkage and identity attribution, state confidence and intelligence gaps, distinguish sourced facts from analytic judgments, and include handling or releasability considerations.',
    keyElements: ['Separately assesses financial linkage and BRKR_RU identity attribution', 'Explains the clustering heuristics and their probabilistic limitations', 'Uses explicit confidence language', 'Identifies collection requirements that could change the assessment', 'Separates sourced facts from analytic judgments', 'Addresses audience, sourcing, and releasability for dissemination'],
    checks: [
      ['Which statement is suitable for dissemination?', ['Rogov is linked to receipt of escrow proceeds with stronger confidence than the assessment that he personally operated BRKR_RU', 'Rogov is definitively BRKR_RU because his KYC appears in the packet', 'Wallet clustering proves identity beyond dispute', 'Prior closed inquiries prove participation in this conspiracy'], 0, 'Foreign Partner Financial Intelligence Return'],
      ['How should the wallet-clustering result be characterized?', ['A probabilistic analytic result requiring corroboration and clear sourcing', 'A bit-for-bit forensic identification of the wallet owner', 'An irrelevant lead with no intelligence value', 'A judicial finding that requires no caveat'], 0, 'BHX Escrow Wallet Cluster Analysis'],
    ],
  },
  {
    key: 'operational_support_da',
    label: 'Data Analyst',
    filters: ['operational_support_da'],
    task: 'Build a sourced financial-flow table covering all four victim sales, the BHX escrow wallet, the Wallet A and Wallet B split, the known Coinquest cashouts, dates, amounts, and any non-exact correlations. Add a short data-quality note for every approximation or unresolved match.',
    keyElements: ['Includes all four victim sales', 'Shows the escrow-to-Wallet A/Wallet B flow', 'Includes both known Coinquest cashouts', 'Labels approximations and unmatched values', 'Cites the source for each material data point'],
    checks: [
      ['What pattern should the table show across the four outbound escrow transactions?', ['A materially consistent approximate 68-72 percent / 28-32 percent split', 'A single destination with no split', 'A random split with no recurring pattern', 'No outbound transactions'], 0, 'BHX Escrow Wallet Cluster Analysis'],
      ['How should the Wallet A and Coinquest relationship be recorded?', ['As a timing-and-magnitude correlation, not an exact reconciliation', 'As a penny-for-penny proven match', 'As conclusively unrelated', 'Without dates or amounts'], 0, 'Reston-Rogov Escrow Negotiation Correlation Memo'],
    ],
  },
  {
    key: 'operational_support_sos',
    label: 'SOS',
    filters: ['operational_support_sos'],
    task: 'Update the master evidence index and lead tracker for all Drop 7 materials. Record source, date, custodian, evidentiary purpose, status, related lead, and whether each item is established evidence, an analytic product, or an outstanding collection requirement.',
    keyElements: ['Indexes all Drop 7 documents', 'Separates evidence, analytic products, and open collection requirements', 'Links every open lead to the gap it addresses', 'Avoids recording analytic conclusions as established evidence'],
    checks: [
      ['How should the BHX wallet-cluster report be classified in the tracker?', ['As an analytic product with methods and limitations preserved', 'As a forensic image of the blockchain', 'As conclusive proof of Rogov\'s identity', 'As an unrelated administrative record'], 0, 'BHX Escrow Wallet Cluster Analysis'],
      ['Which item remains an open collection requirement?', ['Full downstream foreign banking records', 'The already-produced Vertex KYC return', 'The already-produced conspiracy worksheet', 'The already-produced correlation memo'], 0, 'Vertex Digital Assets KYC and Subpoena Return'],
    ],
  },
  {
    key: 'task_force_officer',
    label: 'TFO / Field Lead',
    filters: ['task_force_officer'],
    task: 'Draft a foreign-partner engagement plan for the Rogov lead. Identify the requested assistance, approved communication channel, information that can be shared, operational constraints, expected deliverables, and a fallback plan if the requested assistance is unavailable.',
    keyElements: ['Accounts for the stated treaty and cooperation limitations', 'Requests realistic assistance the partner indicated it may consider', 'Defines what may be shared and through what channel', 'Provides a practical fallback path'],
    checks: [
      ['What cooperation did the foreign partner indicate it may consider?', ['An MLAT request for additional records', 'Immediate extradition under an applicable treaty', 'Unrestricted access to every domestic database', 'No cooperation of any kind'], 0, 'Foreign Partner Financial Intelligence Return'],
      ['What should the liaison plan avoid?', ['Promising extradition or access the partner has not agreed to provide', 'Defining a specific request and purpose', 'Using approved channels', 'Documenting dissemination limits'], 0, 'Foreign Partner Financial Intelligence Return'],
    ],
  },
  {
    key: 'supervisory_intelligence_analyst',
    label: 'Supervisory Intelligence Analyst',
    filters: ['supervisory_intelligence_analyst'],
    task: 'Conduct a senior analytic and dissemination review of the Drop 7 intelligence product. Test its sourcing, confidence statements, alternative explanations, intelligence gaps, foreign-partner caveats, and suitability for release to each intended audience. Return required corrections and collection priorities.',
    keyElements: ['Tests rather than repeats the underlying assessment', 'Identifies at least one viable alternative explanation', 'Reviews sourcing and confidence consistency', 'Addresses dissemination and foreign-partner caveats', 'Prioritizes corrective collection'],
    checks: [
      ['Which issue most requires a supervisory caveat?', ['Financial linkage is stronger than attribution of the BRKR_RU persona', 'The KYC return contains no named account holder', 'No wallet transactions were identified', 'The partner supplied complete downstream banking records'], 0, 'Foreign Partner Financial Intelligence Return'],
      ['What is the best response to an assessment that calls clustering absolute proof?', ['Return it for correction and require probabilistic language plus corroboration needs', 'Approve it because technical products require no caveats', 'Remove all discussion of the financial link', 'Convert it into a forensic-image report'], 0, 'BHX Escrow Wallet Cluster Analysis'],
    ],
  },
  {
    key: 'forensic_accountant',
    label: 'Forensic Accountant',
    filters: ['forensic_accountant'],
    task: 'Prepare a financial-forensic reconciliation. Trace the supported flow of proceeds, evaluate the precision of the Wallet A/Coinquest correlation, assess the two sub-$10,000 cashouts as a potential structuring indicator without overclaiming intent, and identify the financial records needed to strengthen the case.',
    keyElements: ['Reconciles supported flows without inventing exact matches', 'Uses calibrated language for the Wallet A/Coinquest correlation', 'Explains why the cashouts are an indicator rather than proof of structuring intent', 'Identifies specific additional financial records and legal process'],
    checks: [
      ['What can be concluded from the two sub-$10,000 cashouts?', ['They are a potential structuring indicator requiring context and further evidence', 'They conclusively prove criminal structuring intent', 'They have no possible investigative significance', 'They exactly reconcile every Wallet A output'], 0, 'Reston-Rogov Escrow Negotiation Correlation Memo'],
      ['Why is the Wallet A/Coinquest comparison not exact?', ['Price movement and other wallet activity prevent a penny-for-penny reconciliation', 'Coinquest produced no records', 'Wallet A had no activity', 'The transactions occurred years apart'], 0, 'Reston-Rogov Escrow Negotiation Correlation Memo'],
    ],
  },
];

const CERTIFICATION_ASSIGNMENTS = [
  {
    key: 'digital_evidence',
    label: 'Digital Evidence Examination',
    filters: ['DExT', 'CART', 'DFE'],
    task: 'Produce a preservation, collection, and chain-of-custody plan for the additional digital and financial evidence implicated by Drop 7. Distinguish native records, provider returns, derived blockchain-analysis output, and forensic images; identify validation and documentation requirements for each.',
    keyElements: ['Identifies specific evidence to preserve or request', 'Distinguishes derived blockchain analysis from a forensic image', 'Defines provenance, validation, and chain-of-custody requirements', 'Avoids claiming analytic output is a bit-for-bit acquisition'],
    checks: [
      ['How should blockchain-analysis output be documented?', ['As derived analytic output with tools, inputs, methods, versions, and limitations recorded', 'As a bit-for-bit image merely because it contains transaction data', 'Without preserving source identifiers', 'As conclusive identity evidence'], 0, 'BHX Escrow Wallet Cluster Analysis'],
      ['What is essential when preserving a provider return?', ['Document provenance, legal process, receipt, integrity, handling, and any transformations', 'Rewrite it into an analyst summary and discard the source', 'Treat it as anonymous intelligence', 'Remove custodian information'], 0, 'Drop 7 provider returns'],
    ],
  },
  {
    key: 'crypto_forensics',
    label: 'Cryptocurrency and Blockchain Forensics',
    filters: ['crypto_forensics'],
    task: 'Perform a cryptocurrency-forensics review of the BHX escrow flow. Evaluate the clustering heuristics, the Wallet A and Wallet B split, exchange attribution, the Coinquest correlation, and the additional records or technical work required to corroborate the conclusions.',
    keyElements: ['Explains the clustering heuristics and limitations', 'Separates wallet clustering from KYC-based account attribution', 'Evaluates the Coinquest correlation using calibrated language', 'Recommends specific corroborating technical work or records'],
    checks: [
      ['What does common-input-ownership clustering provide?', ['A useful but probabilistic grouping that can be wrong in shared-processing scenarios', 'Conclusive proof of a person\'s identity', 'A forensic image of an exchange account', 'A court order for banking records'], 0, 'BHX Escrow Wallet Cluster Analysis'],
      ['What most directly strengthens wallet-to-person attribution?', ['Corroborating exchange KYC, access, transaction, and downstream financial records', 'Repeating the same heuristic without new data', 'Assuming every clustered address has one user', 'Ignoring provider records'], 0, 'BHX Escrow Wallet Cluster Analysis and Vertex return'],
    ],
  },
];

function buildMultipleChoice([stem, optionTexts, correctIndex, reference]) {
  const optionIds = ['a', 'b', 'c', 'd'];
  return {
    id: uuidv4(),
    stem,
    payload: {
      kind: 'multiple_choice',
      selectionMode: 'single',
      shuffle: true,
      options: optionTexts.map((text, index) => ({ id: optionIds[index], text })),
      correct: [optionIds[correctIndex]],
    },
    scoring: { points: 20, mustPass: false },
    feedback: {
      correct: 'Correct. Apply that judgment in your work product.',
      incorrect: `Recheck ${reference} and revise the reasoning in your work product if needed.`,
      reference,
    },
  };
}

function buildQuestions(assignment) {
  return [
    {
      kind: 'prompt',
      points: 60,
      text: `${assignment.label} - Applied Drop 7 Task\n\n${assignment.task}`,
      rubric: { keyElements: assignment.keyElements, commonErrors },
    },
    ...assignment.checks.map(buildMultipleChoice),
  ];
}

async function insertAssignment(seq, assignment, category, orderIndex, transaction) {
  const title = `${TITLE_PREFIX} ${category} - ${assignment.label}`;
  const questions = buildQuestions(assignment);
  const arrayPlaceholders = assignment.filters.map((_, index) => `:rf${index}`).join(', ');
  const arrayReplacements = Object.fromEntries(assignment.filters.map((value, index) => [`rf${index}`, value]));

  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', 'individual', 100, :orderIndex,
        false, :scenario, :drop, :questions, ARRAY[${arrayPlaceholders}]::text[], NOW(), NOW())`,
    {
      replacements: {
        id: uuidv4(),
        courseId: COURSE_ID,
        title,
        description: `${category} tasking for ${assignment.label}: one applied product and two evidence-based judgment checks.`,
        orderIndex,
        scenario: SCENARIO,
        drop: DROP,
        questions: JSON.stringify(questions),
        ...arrayReplacements,
      },
      transaction,
    },
  );

  console.log(`Seeded unpublished: ${title} [${assignment.filters.join(', ')}]`);
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
      await seq.query(
        `DELETE FROM assignments
         WHERE course_id = :courseId
           AND scenario_name = :scenario
           AND drop_number = :drop
           AND (
             title LIKE :rolePattern
             OR title LIKE :certificationPattern
           )`,
        {
          replacements: {
            courseId: COURSE_ID,
            scenario: SCENARIO,
            drop: DROP,
            rolePattern: '%Drop 7: Role Tasking%',
            certificationPattern: '%Drop 7: Certification Tasking%',
          },
          transaction,
        },
      );

      const [[{ next }]] = await seq.query(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
        { replacements: { courseId: COURSE_ID }, transaction },
      );

      let orderIndex = Number(next);
      for (const assignment of PROFESSIONAL_ASSIGNMENTS) {
        await insertAssignment(seq, assignment, 'Role Tasking', orderIndex++, transaction);
      }
      for (const assignment of CERTIFICATION_ASSIGNMENTS) {
        await insertAssignment(seq, assignment, 'Certification Tasking', orderIndex++, transaction);
      }
    });

    console.log(`Seeded ${PROFESSIONAL_ASSIGNMENTS.length} professional-role and ${CERTIFICATION_ASSIGNMENTS.length} certification assignments, all unpublished.`);
  } finally {
    await seq.close();
  }
}

module.exports = {
  COURSE_ID,
  DROP,
  SCENARIO,
  PROFESSIONAL_ASSIGNMENTS,
  CERTIFICATION_ASSIGNMENTS,
  buildMultipleChoice,
  buildQuestions,
};

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
