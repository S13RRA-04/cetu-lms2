'use strict';
/**
 * Seed PACKET HEIST — Drop 5 shared squad challenges.
 *
 * Sources: Command Post Bulletin 004, Command Post Deconfliction Summary,
 * Master Insider Access Timeline v2.0, Listing-to-Victim Correlation Matrix,
 * Foreign Partner BRKR_RU Intelligence Report, Crypto Payment Lead Return,
 * Dogwood Badge Access Return, Support Email Header Return, Probable Cause
 * Development Worksheet, Search Target Matrix, and Evidence Destruction Risk
 * Assessment in scenarios/PACKET HEIST/Drop 5.
 *
 * Run: node backend/scripts/seed-packet-heist-drop5.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 5;
const SCENARIO = 'packet-heist';
const ANALYSIS_TITLE = 'PACKET HEIST — Drop 5: Access Broker Attribution Assessment';
const DELIVERABLE_TITLE = 'PACKET HEIST — Drop 5: Probable Cause and Search Plan';

const analysisQuestions = [
  {
    id: uuidv4(),
    stem: 'What is the strongest commonality across the four downstream intrusions?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'A single hands-on-keyboard actor used identical infrastructure and objectives' },
        { id: 'b', text: 'Different buyers used access matching accounts created or retained during RestonIT-associated support activity' },
        { id: 'c', text: 'Every victim was compromised through the same phishing message' },
        { id: 'd', text: 'BRKR_RU personally conducted all four victim intrusions' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The deconfliction summary separates the different downstream buyers from the common upstream access source and credential-custody trail.',
      incorrect: 'Review the Command Post Deconfliction Summary and distinguish the downstream operators from the upstream access supplier.',
      reference: 'Command Post Deconfliction Summary',
    },
  },
  {
    id: uuidv4(),
    stem: 'Foreign-partner reporting identifies BRKR_AL as which type of participant?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'A supplier of initial access to BRKR_RU' },
        { id: 'b', text: 'A confirmed downstream ransomware operator' },
        { id: 'c', text: 'A victim organization' },
        { id: 'd', text: 'A law-enforcement undercover identity' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The report assesses BRKR_AL as a supplier while BRKR_RU acts as the broker or marketplace-facing vendor.',
      incorrect: 'Review the Foreign Partner Assessment and keep supplier, broker, buyer, and operator roles separate.',
      reference: 'Foreign Partner BRKR_RU Intelligence Report',
    },
  },
  {
    id: uuidv4(),
    stem: 'The Drop 5 packet conclusively identifies Alex Reston as the person behind BRKR_AL.',
    payload: { kind: 'true_false', correct: false },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct. The evidence creates a substantial nexus but does not conclusively identify the person behind BRKR_AL.',
      incorrect: 'Review the limitations in the foreign-partner report and Master Insider Access Timeline.',
      reference: 'Master Insider Access Timeline v2.0',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which evidence places Alex Reston at Suite 214 during late-evening periods associated with access-package activity?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Dogwood badge-access records' },
        { id: 'b', text: 'Victim firewall logs' },
        { id: 'c', text: 'Cryptocurrency blockchain attribution' },
        { id: 'd', text: 'A recorded subject interview' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The badge return establishes presence at the office, while expressly not proving what Reston did there.',
      incorrect: 'Review the Dogwood Badge Access Return and its Command Post limitation.',
      reference: 'Dogwood Badge Access Return',
    },
  },
  {
    id: uuidv4(),
    stem: 'What does the support-email provider return establish?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'The full attachment contained all four plaintext victim passwords' },
        { id: 'b', text: 'Alex sent a message within the RestonIT tenant with an attachment name matching a recent credential-export label' },
        { id: 'c', text: 'The attachment was sent directly to BRKR_RU' },
        { id: 'd', text: 'The provider recovered the full message and attachment content' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The metadata establishes timing, sender/recipient, and a matching filename; it does not reveal the attachment contents.',
      incorrect: 'Distinguish provider metadata from unavailable message and attachment content.',
      reference: 'Support Email Header Return',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which conclusions are supported by the crypto payment lead? (Select all that apply)',
    payload: {
      kind: 'multiple_choice', selectionMode: 'multiple', shuffle: true,
      options: [
        { id: 'a', text: 'The exchange account is registered to Alex Reston and linked to his residence and bank account' },
        { id: 'b', text: 'Deposits occurred during the access listing and sale window' },
        { id: 'c', text: 'BRKR_RU is conclusively identified as the sender' },
        { id: 'd', text: 'The deposits are conclusively proven to be access-sale proceeds' },
      ],
      correct: ['a', 'b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'The KYC and timing strengthen nexus and motive; sender identity and criminal provenance remain unproven.',
      incorrect: 'Apply the limitations stated in the Crypto Payment Lead Return.',
      reference: 'Crypto - Payment Lead Return',
    },
  },
  {
    id: uuidv4(),
    stem: 'Why does Command Post advise against contacting RestonIT before executing search authority?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'RestonIT has already refused a subpoena' },
        { id: 'b', text: 'Direct contact could trigger deletion, alteration, concealment, or coordination involving digital evidence' },
        { id: 'c', text: 'The office location is unknown' },
        { id: 'd', text: 'No relevant evidence is expected at the office' },
      ],
      correct: ['b'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Centralized control, export evidence, broker activity, and easily moved digital evidence support the destruction-risk assessment.',
      incorrect: 'Review the nine factors in the Evidence Destruction Risk Assessment.',
      reference: 'Evidence Destruction Risk Assessment',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which statement correctly describes the search nexus?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Only the office has a nexus because personal devices can never contain business evidence' },
        { id: 'b', text: 'Only the residence has a nexus because RestonIT has no physical office' },
        { id: 'c', text: 'The office is tied to business systems and credential custody; the residence is tied to Alex, personal devices, crypto KYC, and possible broker artifacts' },
        { id: 'd', text: 'Both locations may be searched without describing evidence expected at each one' },
      ],
      correct: ['c'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Probable cause must connect each target location to the particular evidence expected there.',
      incorrect: 'Review Targets 1 and 2 in the Search Target Matrix.',
      reference: 'Search Target Matrix',
    },
  },
  {
    id: uuidv4(),
    stem: 'The Master Insider Access Timeline supports which four-phase pattern?',
    payload: { kind: 'fill_blank', blanks: [{ accepted: ['provisioning, dormancy, brokering, and downstream intrusion', 'provisioning dormancy brokering downstream intrusion'], caseSensitive: false }] },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Correct: provisioning, dormancy, brokering, and downstream intrusion.',
      incorrect: 'Review the four phase headings in Master Insider Access Timeline v2.0.',
      reference: 'Master Insider Access Timeline v2.0',
    },
  },
  {
    id: uuidv4(),
    stem: 'Which Drop 5 source received only moderate-to-high confidence in its victim-listing match rather than high confidence?',
    payload: {
      kind: 'multiple_choice', selectionMode: 'single', shuffle: true,
      options: [
        { id: 'a', text: 'Redstone Memorial Hospital' },
        { id: 'b', text: 'Dogwood Hotel' },
        { id: 'c', text: 'CyberDyne Data Center' },
        { id: 'd', text: 'Pixel Play Arcade' },
      ],
      correct: ['a'],
    },
    scoring: { points: 10, mustPass: false },
    feedback: {
      correct: 'Redstone is assessed moderate-to-high; the other three listing matches are assessed high confidence.',
      incorrect: 'Review the Listing-to-Victim Correlation Matrix.',
      reference: 'Listing-to-Victim Correlation Matrix',
    },
  },
];

const deliverableQuestions = [
  {
    kind: 'prompt', points: 20,
    text: 'Write a concise probable-cause theory that separates the different downstream intruders from the alleged upstream access-supply activity. Cite at least five specific Drop 5 facts and state the suspected offenses or investigative matters.',
    rubric: {
      keyElements: ['Separates downstream buyers/operators from the upstream supplier theory', 'Cites at least five specific Drop 5 facts', 'Identifies the suspected unauthorized-access, credential-misuse, brokering, fraud, or conspiracy theory', 'Uses evidence-based confidence language'],
      commonErrors: ['Treating all four intrusions as one actor', 'Declaring Alex Reston or BRKR_AL conclusively identified'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Build an office-versus-residence nexus matrix. For each location, identify the facts establishing nexus and the particular devices, records, communications, credentials, financial artifacts, or authentication materials expected there.',
    rubric: {
      keyElements: ['Separately analyzes Suite 214 and Alex Reston residence', 'Connects each location to specific supporting facts', 'Lists evidence categories particular to each location', 'Avoids unsupported vehicle or travel-item authority'],
      commonErrors: ['Using the same generic nexus for both locations', 'Listing evidence without connecting it to a target location'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Create a four-phase chronology covering provisioning, dormancy, brokering, and downstream intrusion. Include all four victims and identify the evidence source supporting each phase.',
    rubric: {
      keyElements: ['Includes all four phases in the correct sequence', 'Includes all four victim accounts', 'Uses corrected Master Timeline v2.0 source IPs and timestamps', 'Cites the source or exhibit supporting each phase'],
      commonErrors: ['Using superseded Redstone or Pixel Play source IPs', 'Collapsing brokering and downstream intrusion into one event'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Prepare a limitations and alternative-explanations section. Address BRKR_AL identity, credential-export contents, crypto provenance, badge-record limitations, and the possibility of compromise, negligence, or another RestonIT employee.',
    rubric: {
      keyElements: ['Addresses all five required limitation areas', 'Distinguishes presence and opportunity from conduct and intent', 'Offers plausible alternative explanations', 'Identifies additional evidence that would resolve material gaps'],
      commonErrors: ['Presenting circumstantial evidence as conclusive', 'Ignoring exculpatory or alternative explanations'],
    },
  },
  {
    kind: 'prompt', points: 20,
    text: 'Develop an execution and digital-evidence preservation plan for the proposed searches. Prioritize devices, cloud accounts, mailboxes, exports, crypto artifacts, removable media, authentication materials, and initial interviews while explaining how the plan mitigates destruction or coordination risk.',
    rubric: {
      keyElements: ['Prioritizes volatile and remotely alterable evidence', 'Covers office and residence evidence categories', 'Addresses account preservation and authentication materials', 'Sequences interviews to reduce coordination risk', 'Ties safeguards to documented destruction-risk factors'],
      commonErrors: ['Generic seizure list with no prioritization', 'Contacting subjects before preservation without addressing the documented risk'],
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
        { id: uuidv4(), title: ANALYSIS_TITLE, description: 'Assess the Drop 5 legal-process and partner returns, distinguish upstream access supply from downstream intrusion activity, and state only conclusions supported by the evidence.', maxScore: 100, orderIndex: Number(next), questions: analysisQuestions },
        { id: uuidv4(), title: DELIVERABLE_TITLE, description: 'As a squad, develop a defensible probable-cause theory, location-specific search nexus, corrected chronology, limitations analysis, and evidence-preservation plan from the Drop 5 packet.', maxScore: 100, orderIndex: Number(next) + 1, questions: deliverableQuestions },
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
