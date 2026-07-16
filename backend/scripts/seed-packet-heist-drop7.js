'use strict';
/**
 * Seed the single shared PACKET HEIST Drop 7 Command Post synthesis.
 *
 * Drop 7 knowledge checks belong in the professional-role and certification
 * assignments. This shared challenge is intentionally one synthesis product
 * that depends on the work contributed by every represented squad role.
 *
 * Run: node backend/scripts/seed-packet-heist-drop7.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 7;
const SCENARIO = 'packet-heist';
const LEGACY_ANALYSIS_TITLE = 'PACKET HEIST - Drop 7: Financial and Cryptocurrency Conspiracy Assessment';
const DELIVERABLE_TITLE = 'PACKET HEIST - Drop 7: Command Post Case Assessment';
const LEGACY_DELIVERABLE_TITLE = 'PACKET HEIST - Drop 7: Reston-Rogov Conspiracy Case Theory';

const synthesisQuestions = [
  {
    kind: 'prompt',
    points: 100,
    text: [
      'COMMAND POST CASE ASSESSMENT',
      '',
      'Produce one squad assessment of the Reston-Rogov case using the Drop 5-7 record. Your assessment must:',
      '1. State the proposed conspiracy and cite the strongest supporting evidence.',
      '2. Separate established facts from analytic judgments or inferences.',
      '3. Present the strongest credible alternative explanation or counterargument.',
      '4. State a calibrated confidence level and explain what drives it.',
      '5. Recommend and prioritize the next investigative action.',
      '6. Identify the substantive contribution made by every professional role represented in your squad.',
      '',
      'Use these headings: Proposed Case Theory; Established Facts; Analytic Judgments and Confidence; Strongest Alternative Explanation; Recommended Next Action; Represented Role Contributions.',
      '',
      'Only list roles actually represented in your squad. Certification-based expertise may inform a member\'s contribution, but it is not a separate professional role.',
    ].join('\n'),
    rubric: {
      keyElements: [
        'States a defensible conspiracy theory grounded in specific evidence from Drops 5 through 7',
        'Clearly separates established facts from analytic judgments and inferences',
        'Presents a genuine alternative explanation or counterargument',
        'Uses calibrated confidence language consistent with the evidence limitations',
        'Recommends one prioritized next investigative action with reasoning',
        'Identifies a substantive contribution from every professional role represented in the squad',
        'Treats certifications as expertise supporting a member\'s role contribution, not as additional professional roles',
      ],
      commonErrors: [
        'Declaring Mikhail Rogov conclusively identified as BRKR_RU',
        'Treating probabilistic wallet clustering as absolute attribution',
        'Listing role names without explaining their substantive contributions',
        'Submitting separate mini-memos instead of one integrated squad assessment',
      ],
    },
  },
];

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
             title LIKE :legacyAnalysisPattern
             OR title LIKE :legacyDeliverablePattern
             OR title = :deliverableTitle
           )`,
        {
          replacements: {
            courseId: COURSE_ID,
            scenario: SCENARIO,
            drop: DROP,
            legacyAnalysisPattern: '%Drop 7: Financial and Cryptocurrency Conspiracy Assessment',
            deliverableTitle: DELIVERABLE_TITLE,
            legacyDeliverablePattern: '%Drop 7: Reston-Rogov Conspiracy Case Theory',
          },
          transaction,
        },
      );

      const [[{ next }]] = await seq.query(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
        { replacements: { courseId: COURSE_ID }, transaction },
      );

      await seq.query(
        `INSERT INTO assignments
           (id, course_id, title, description, type, grading_mode, max_score, order_index,
            is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
         VALUES
           (:id, :courseId, :title, :description, 'challenge', 'squad', 100, :orderIndex,
            false, :scenario, :drop, :questions, '{}', NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            courseId: COURSE_ID,
            title: DELIVERABLE_TITLE,
            description: 'Integrate the work of every represented professional role into one evidence-based Command Post assessment and prioritized investigative recommendation.',
            orderIndex: Number(next),
            scenario: SCENARIO,
            drop: DROP,
            questions: JSON.stringify(synthesisQuestions),
          },
          transaction,
        },
      );
    });

    console.log(`Seeded unpublished squad synthesis: ${DELIVERABLE_TITLE}`);
  } finally {
    await seq.close();
  }
}

module.exports = {
  COURSE_ID,
  DROP,
  SCENARIO,
  LEGACY_ANALYSIS_TITLE,
  DELIVERABLE_TITLE,
  LEGACY_DELIVERABLE_TITLE,
  synthesisQuestions,
};

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
