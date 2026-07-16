'use strict';
/**
 * Add the missing Forensic Accountant individual role challenge to PACKET
 * HEIST Drop 4 without recreating or deleting the existing released role work.
 * Safe to rerun: the assignment is updated in place after its first insert.
 *
 * Run: node backend/scripts/seed-packet-heist-drop4-forensic-accountant.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize, Transaction } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const TITLE = 'PACKET HEIST — Drop 4: Role Tasking — Forensic Accountant';
const ORDER_INDEX = 71;

const question = {
  kind: 'prompt',
  points: 30,
  text: 'Forensic Accountant — RestonIT Financial and Contract Correlation\n\nPrepare a financial-forensic reconciliation of RestonIT’s relationship with the four victim organizations. Using the contract excerpts, client relationship matrix, support-ticket index, and available billing or account-closeout records, distinguish legitimate paid support activity from access that remained available after an engagement ended. Identify anomalies or gaps that require additional financial records, explain what each requested record would establish, and use calibrated language that does not treat a billing or closeout discrepancy as proof of criminal intent.',
  rubric: {
    keyElements: [
      'Accounts for all four victim organizations and ties conclusions to the supplied RestonIT records',
      'Distinguishes legitimate contracted support activity from post-closeout or otherwise unexplained access',
      'Identifies specific financial records to obtain, such as invoices, payment ledgers, bank deposits, refunds, credits, payroll, or contractor payments',
      'Explains what each requested record would establish or rule out',
      'Separates financial or control anomalies from proof of knowledge, intent, or participation in the intrusions',
    ],
    commonErrors: [
      'Inventing transaction amounts, payments, invoices, or account activity not present in the Drop 4 evidence',
      'Treating a contract, invoice, billing gap, or retained account as proof RestonIT committed the intrusions',
      'Requesting broad financial records without connecting them to a specific investigative question',
      'Reviewing only one victim instead of reconciling the pattern across all four relationships',
    ],
  },
};

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

(async () => {
  await seq.authenticate();
  const transaction = await seq.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE });
  try {
    const [existing] = await seq.query(
      `SELECT id, order_index FROM assignments
       WHERE course_id = :courseId AND title = :title
       FOR UPDATE`,
      { replacements: { courseId: COURSE_ID, title: TITLE }, transaction },
    );

    if (existing.length === 0) {
      await seq.query(
        `UPDATE assignments
         SET order_index = order_index + 1, updated_at = NOW()
         WHERE course_id = :courseId AND type = 'challenge' AND order_index >= :orderIndex`,
        { replacements: { courseId: COURSE_ID, orderIndex: ORDER_INDEX }, transaction },
      );
    }

    const id = existing[0]?.id ?? uuidv4();
    await seq.query(
      `INSERT INTO assignments
         (id, course_id, title, description, type, grading_mode, max_score, order_index,
          is_published, scenario_name, drop_number, questions, role_filters, created_at, updated_at)
       VALUES
         (:id, :courseId, :title, :description, 'challenge', 'individual', 30, :orderIndex,
          true, 'packet-heist', 4, :questions, ARRAY['forensic_accountant']::text[], NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         type = EXCLUDED.type,
         grading_mode = EXCLUDED.grading_mode,
         max_score = EXCLUDED.max_score,
         order_index = EXCLUDED.order_index,
         is_published = EXCLUDED.is_published,
         scenario_name = EXCLUDED.scenario_name,
         drop_number = EXCLUDED.drop_number,
         questions = EXCLUDED.questions,
         role_filters = EXCLUDED.role_filters,
         updated_at = NOW()`,
      {
        replacements: {
          id,
          courseId: COURSE_ID,
          title: TITLE,
          description: 'Individual Forensic Accountant tasking for the Drop 4 RestonIT Shared MSP Correlation investigation.',
          orderIndex: ORDER_INDEX,
          questions: JSON.stringify([question]),
        },
        transaction,
      },
    );

    // Drop 4 may already be released. Inherit the cohort/squad scopes used by
    // the existing Drop 4 role assignments so this new lane is truly available
    // wherever its peers are, without broadening access to another cohort.
    const [releaseScopes] = await seq.query(
      `SELECT DISTINCT u.cohort_id, u.squad_id, u.unlocked_by
       FROM assignment_unlocks u
       JOIN assignments a ON a.id = u.assignment_id
       WHERE a.course_id = :courseId
         AND a.scenario_name = 'packet-heist'
         AND a.drop_number = 4
         AND a.title LIKE 'PACKET HEIST — Drop 4: Role Tasking — %'
         AND a.id <> :id`,
      { replacements: { courseId: COURSE_ID, id }, transaction },
    );
    for (const scope of releaseScopes) {
      await seq.query(
        `INSERT INTO assignment_unlocks
           (id, assignment_id, cohort_id, squad_id, unlocked_by, unlocked_at)
         VALUES (:unlockId, :assignmentId, :cohortId, :squadId, :unlockedBy, NOW())
         ON CONFLICT DO NOTHING`,
        {
          replacements: {
            unlockId: uuidv4(),
            assignmentId: id,
            cohortId: scope.cohort_id,
            squadId: scope.squad_id,
            unlockedBy: scope.unlocked_by,
          },
          transaction,
        },
      );
    }

    await transaction.commit();
    const [verified] = await seq.query(
      `SELECT a.id, a.order_index, a.is_published, a.drop_number, a.role_filters,
              COUNT(u.id)::int AS unlock_count
       FROM assignments a
       LEFT JOIN assignment_unlocks u ON u.assignment_id = a.id
       WHERE a.course_id = :courseId AND a.title = :title
       GROUP BY a.id`,
      { replacements: { courseId: COURSE_ID, title: TITLE } },
    );
    if (
      verified.length !== 1
      || verified[0].order_index !== ORDER_INDEX
      || verified[0].is_published !== true
      || verified[0].drop_number !== 4
      || verified[0].role_filters?.length !== 1
      || verified[0].role_filters[0] !== 'forensic_accountant'
      || verified[0].unlock_count < 1
    ) {
      throw new Error('Post-write verification failed for the Drop 4 Forensic Accountant assignment.');
    }
    console.log(`✓ ${TITLE}`);
    console.log(`  published=true drop=4 role_filters=[forensic_accountant] order_index=71 max_score=30 unlocks=${verified[0].unlock_count}`);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    throw error;
  } finally {
    await seq.close();
  }
})().catch((error) => { console.error(error.message); process.exit(1); });
