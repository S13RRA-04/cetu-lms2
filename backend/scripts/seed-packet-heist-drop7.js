'use strict';
/**
 * Seed PACKET HEIST — Drop 7 shared squad challenges (financial and
 * cryptocurrency legal process tying Alex Reston and Mikhail Rogov / BRKR_RU
 * to a conspiracy to sell compromised access).
 *
 * Sources: PACT v5 project, Drops/7/*.md — BHX Escrow Wallet Cluster
 * Analysis, Vertex Digital Assets KYC/Subpoena Return, Foreign Partner
 * Financial Intelligence Return, Reston-Rogov Escrow Negotiation Correlation
 * Memo, Conspiracy Elements Assessment Worksheet, Command Post Bulletin 006
 * (rendered to PDF and uploaded to R2 by
 * backend/scripts/setup-packet-heist-drop7.js).
 *
 * Run: node backend/scripts/seed-packet-heist-drop7.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 7;
const SCENARIO = 'packet-heist';
const ANALYSIS_TITLE = 'PACKET HEIST — Drop 7: Financial and Cryptocurrency Conspiracy Assessment';
const DELIVERABLE_TITLE = 'PACKET HEIST — Drop 7: Reston-Rogov Conspiracy Case Theory';

const analysisQuestions = [
  {
    id: uuidv4(),
    stem: 'What consistent pattern did the chain-analysis report find in the BHX escrow wallet\'s outbound transactions across all four victim sales?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'A consistent ~68-72% / 28-32% split to two downstream wallets ("Wallet A" and "Wallet B")' },
        { id: 'b', text: 'All funds went to a single wallet with no split' },
        { id: 'c', text: 'The split ratio changed randomly each time, suggesting no standing arrangement' },
        { id: 'd', text: 'No outbound transactions were ever found' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The materially consistent split ratio across four independent transactions is what leads analysts to assess a standing revenue-share arrangement rather than ad hoc payments.',
      incorrect: 'Review Section 3 (Outbound Split) of the BHX Escrow Wallet Cluster Analysis.',
      reference: 'BHX Escrow Wallet Cluster Analysis',
    },
  },
  {
    id: uuidv4(),
    stem: 'Who does the Vertex Digital Assets KYC/subpoena return identify as the holder of the account receiving "Wallet B" funds?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Mikhail Rogov' },
        { id: 'b', text: 'Alex Reston' },
        { id: 'c', text: 'Sam Smith' },
        { id: 'd', text: 'An anonymous account with no KYC on file' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Vertex Digital Assets KYC records identify Mikhail Sergeyevich Rogov, a Russian national, as the Tier 2 account holder.',
      incorrect: 'Review the account identification table in the Vertex Digital Assets KYC and Subpoena Return.',
      reference: 'Vertex Digital Assets — KYC and Subpoena Return (Rogov Account)',
    },
  },
  {
    id: uuidv4(),
    stem: 'What critical distinction does the Foreign Partner Financial Intelligence Return draw regarding Mikhail Rogov?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: '"Financially linked to the escrow proceeds" is not the same as "conclusively identified as the BRKR_RU forum operator" — the latter has lower confidence' },
        { id: 'b', text: 'Rogov has already confessed to being BRKR_RU' },
        { id: 'c', text: 'Rogov has no connection to any account receiving escrow funds' },
        { id: 'd', text: 'The partner nation will extradite Rogov immediately' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The return explicitly separates financial linkage (moderate-to-high confidence) from forum-operator identification (lower confidence, pending further legal process).',
      incorrect: 'Review Section 5 (Assessment) of the Foreign Partner Financial Intelligence Return.',
      reference: 'Foreign Partner Financial Intelligence Return — Mikhail Rogov',
    },
  },
  {
    id: uuidv4(),
    stem: 'Fill in the blank: this packet\'s financial evidence directly answers the question raised by a handwritten legal-pad note recovered in the Drop 6 office search, which read "__________"',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['RU takes cut?', 'RU takes cut'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — the note asked "RU takes cut?" and the chain-analysis / Vertex KYC evidence now answers it: yes, consistently, at a 28-32% ratio.',
      incorrect: 'Review the Reston-Rogov Escrow Negotiation Correlation Memo, Section 2.',
      reference: 'Reston-Rogov Escrow Negotiation Correlation Memo',
    },
  },
  {
    id: uuidv4(),
    stem: 'Why does the Escrow Negotiation Correlation Memo caution against describing the link between Wallet A and Alex Reston\'s two Coinquest cashouts as an exact reconciliation?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'BTC/USD price movement and Wallet A\'s other activity in the same window mean the correlation is a timing/magnitude match, not a penny-for-penny accounting match' },
        { id: 'b', text: 'The two cashouts have nothing to do with Wallet A at all' },
        { id: 'c', text: 'The cashout amounts exactly match the wallet outputs to the cent' },
        { id: 'd', text: 'Coinquest refused to provide any records' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The memo explicitly calls this a timing and magnitude correlation, not an exact reconciliation, and instructs using calibrated language like "consistent with."',
      incorrect: 'Review Section 3 of the Reston-Rogov Escrow Negotiation Correlation Memo.',
      reference: 'Reston-Rogov Escrow Negotiation Correlation Memo',
    },
  },
  {
    id: uuidv4(),
    stem: 'What is required to obtain Mikhail Rogov\'s full downstream banking records beyond what the Vertex return already provided?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Additional legal process (e.g., a mutual legal assistance request) directed at the Kaliningrad-region financial institution' },
        { id: 'b', text: 'Nothing further — Vertex already provided complete banking records' },
        { id: 'c', text: 'A search warrant executed at Rogov\'s residence' },
        { id: 'd', text: 'Sam Smith\'s testimony' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Vertex\'s return only covered the exchange account itself; full downstream bank records require separate legal process, noted as not yet obtained.',
      incorrect: 'Review Section 3 and Section 5 (Limitations) of the Vertex Digital Assets KYC and Subpoena Return.',
      reference: 'Vertex Digital Assets — KYC and Subpoena Return (Rogov Account)',
    },
  },
  {
    id: uuidv4(),
    stem: 'The foreign partner\'s jurisdiction has an extradition treaty covering the offenses currently under investigation in this case.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct — false. The partner explicitly states no extradition treaty covers these offenses, though it will consider a mutual legal assistance request.',
      incorrect: 'Review Section 4 (Cooperation Status and Limitations) of the Foreign Partner Financial Intelligence Return.',
      reference: 'Foreign Partner Financial Intelligence Return — Mikhail Rogov',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which prior-history detail did the foreign partner disclose about Mikhail Rogov, and how should squads treat it?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Two prior domestic financial-crime inquiries (2022, 2024), both closed without charges — background context, not evidence of the current conspiracy' },
        { id: 'b', text: 'A 2023 conviction for the same conspiracy — directly usable as proof' },
        { id: 'c', text: 'No prior law-enforcement contact of any kind' },
        { id: 'd', text: 'A confirmed partnership with Sam Smith' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The return is explicit that this is background context, not evidence of the current conspiracy, and warns against presenting it as prior bad acts without legal review.',
      incorrect: 'Review Section 3 (Prior Law-Enforcement Interest) of the Foreign Partner Financial Intelligence Return.',
      reference: 'Foreign Partner Financial Intelligence Return — Mikhail Rogov',
    },
  },
  {
    id: uuidv4(),
    stem: 'Fill in the blank: the foreign-licensed virtual asset service provider that held Mikhail Rogov\'s KYC\'d account is __________.',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['Vertex Digital Assets', 'Vertex'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct: Vertex Digital Assets OÜ, an Estonia-licensed VASP.',
      incorrect: 'Review the header of the Vertex Digital Assets KYC and Subpoena Return.',
      reference: 'Vertex Digital Assets — KYC and Subpoena Return (Rogov Account)',
    },
  },
  {
    id: uuidv4(),
    stem: 'Per the Conspiracy Elements Assessment Worksheet, which of the following is the strongest characterization of what the Drop 7 packet, combined with Drops 5-6, currently supports?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Multiple independent evidence sources (negotiation notes, the office legal-pad note, and a consistent four-transaction financial split) converge to support an agreement and overt acts, but the object of the conspiracy and the full scope of Rogov\'s personal role still warrant calibrated, non-absolute language' },
        { id: 'b', text: 'The case is fully proven beyond any doubt and requires no further investigation' },
        { id: 'c', text: 'The financial evidence is irrelevant to a conspiracy theory' },
        { id: 'd', text: 'Only Alex Reston can be discussed; Rogov must be excluded entirely from any case theory' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The worksheet asks squads to map evidence to conspiracy elements while explicitly cautioning against overclaiming — multiple converging sources support agreement/overt acts, but some elements (like Rogov\'s exact role) remain open.',
      incorrect: 'Review Sections 2-4 of the Conspiracy Elements Assessment Worksheet.',
      reference: 'Conspiracy Elements Assessment Worksheet',
    },
  },
];

const deliverableQuestions = [
  {
    kind: 'prompt', points: 20,
    text: 'Write a conspiracy elements memo mapping the Drop 5-7 evidence to agreement, overt acts, and object of the conspiracy. Cite at least five specific facts, drawn from at least three different Drop 7 documents.',
    rubric: {
      keyElements: ['Separately addresses agreement, overt acts, and object of the conspiracy', 'Cites at least five specific, sourced facts', 'Draws from at least three different Drop 7 documents', 'Uses the worksheet\'s framework rather than inventing a new one'],
      commonErrors: ['Treating financial correlation alone as proof of agreement', 'Citing only one document for all facts'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Write a confidence-calibrated attribution statement about Mikhail Rogov. Explicitly distinguish what is established (financial linkage to the escrow proceeds) from what remains unproven (personal operation of the BRKR_RU forum persona), and state what additional evidence would resolve the gap.',
    rubric: {
      keyElements: ['Explicitly separates financial linkage from forum-operator identification', 'Uses calibrated confidence language, not absolute certainty', 'Identifies specific additional evidence that would close the gap', 'Does not overstate the foreign partner\'s cooperation or the extradition posture'],
      commonErrors: ['Declaring Rogov conclusively identified as BRKR_RU', 'Ignoring the extradition/jurisdiction limitations'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Write the financial narrative connecting the Drop 6 Coinquest cashouts to the Drop 7 chain-analysis findings, using appropriately hedged language for the parts of the correlation that are not exact.',
    rubric: {
      keyElements: ['Connects the two Coinquest cashouts to Wallet A activity', 'Uses hedged/calibrated language for the non-exact portions of the correlation', 'Cites specific dates and amounts from both Drop 6 and Drop 7 sources', 'Does not claim a penny-for-penny reconciliation the evidence does not support'],
      commonErrors: ['Presenting the correlation as an exact accounting match', 'Omitting the CTR-structuring observation from Drop 6'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Write a gaps-and-next-steps memo. Identify what further legal process, evidence, or investigative steps would most strengthen the conspiracy case against both Reston and Rogov, and rank them by likely investigative value.',
    rubric: {
      keyElements: ['Identifies at least three concrete next steps (e.g., MLAT for full banking records, direct Reston-Rogov communications, foreign-partner interview of Rogov)', 'Ranks or prioritizes the steps with reasoning', 'Distinguishes steps that address Reston vs. steps that address Rogov specifically', 'Grounded in gaps explicitly flagged in the Drop 7 documents'],
      commonErrors: ['Generic list with no prioritization or reasoning', 'Ignoring the specific limitations documented in each source'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'As a squad, write the final Reston-Rogov case theory synthesizing Drops 5 through 7. State the strongest version of the conspiracy theory, the strongest counterargument or alternative explanation, and your overall confidence assessment.',
    rubric: {
      keyElements: ['Synthesizes evidence across Drops 5, 6, and 7, not just Drop 7 alone', 'States a clear conspiracy theory with supporting citations', 'Presents at least one genuine counterargument or alternative explanation', 'Provides an overall, appropriately calibrated confidence assessment'],
      commonErrors: ['Ignoring earlier drops entirely', 'Presenting no counterargument or alternative explanation', 'Overclaiming certainty inconsistent with the documented limitations'],
    },
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const seq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
  });
  try {
    await seq.authenticate();
    await seq.transaction(async (transaction) => {
      await seq.query(
        `DELETE FROM assignments WHERE course_id = :courseId AND scenario_name = :scenario
         AND drop_number = :drop AND title IN (:analysisTitle, :deliverableTitle)`,
        { replacements: { courseId: COURSE_ID, scenario: SCENARIO, drop: DROP, analysisTitle: ANALYSIS_TITLE, deliverableTitle: DELIVERABLE_TITLE }, transaction },
      );
      const [[{ next }]] = await seq.query(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
        { replacements: { courseId: COURSE_ID }, transaction },
      );
      const rows = [
        { id: uuidv4(), title: ANALYSIS_TITLE, description: 'Assess the Drop 7 chain-analysis, exchange KYC, and foreign-partner returns tying Mikhail Rogov to the BHX escrow proceeds, and state only conclusions the evidence supports.', maxScore: 100, orderIndex: Number(next), questions: analysisQuestions },
        { id: uuidv4(), title: DELIVERABLE_TITLE, description: 'As a squad, synthesize the Drop 5-7 record into a defensible conspiracy theory tying Alex Reston and Mikhail Rogov together, with calibrated confidence and documented gaps.', maxScore: 100, orderIndex: Number(next) + 1, questions: deliverableQuestions },
      ];
      for (const row of rows) {
        await seq.query(
          `INSERT INTO assignments
             (id, course_id, title, description, type, grading_mode, max_score, order_index,
              is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
           VALUES (:id, :courseId, :title, :description, 'challenge', 'squad', :maxScore, :orderIndex,
              false, :scenario, :drop, :questions, '{}', NOW(), NOW())`,
          { replacements: { ...row, courseId: COURSE_ID, scenario: SCENARIO, drop: DROP, questions: JSON.stringify(row.questions) }, transaction },
        );
      }
    });
    console.log(`Seeded ${ANALYSIS_TITLE} and ${DELIVERABLE_TITLE} as unpublished squad challenges.`);
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, DROP, SCENARIO, ANALYSIS_TITLE, DELIVERABLE_TITLE, analysisQuestions, deliverableQuestions };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
