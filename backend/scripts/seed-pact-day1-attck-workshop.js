'use strict';
/**
 * Seed the Day 1 "ATT&CK Mapping Workshop" (Ashgrove Freight & Logistics) —
 * see lib/day1AttckWorkshopSpec.js for the full content/rationale.
 *
 * Not part of packet-heist/packet-heist-v2 (no drop_number/scenario_name),
 * same standalone pattern as the Day 1 Hive workshop — gated purely by
 * is_published + per-squad AssignmentUnlock, not the campaign release engine.
 *
 * Placed directly after "Day 1 Challenge — MITRE ATT&CK Mapping" by reading
 * that row's live order_index rather than hardcoding it (it sits at 28
 * among the Drop 1 rows, not in the 0–7 Day 1 lecture block). Shares that
 * order_index + 1 with existing rows rather than shifting them — ties are
 * already common in this course's ordering.
 *
 * Safe to rerun: deletes and reseeds by title, but only after confirming
 * live that the prior row has zero submissions/grades.
 *
 * Run: node backend/scripts/seed-pact-day1-attck-workshop.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { TITLE, LAUNCH_BRIEFING, DESCRIPTION, buildQuestions } = require('./lib/day1AttckWorkshopSpec');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const ATTCK_QUIZ_TITLE = 'Day 1 Challenge — MITRE ATT&CK Mapping';

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
      const [quiz] = await seq.query(
        `SELECT order_index FROM assignments WHERE course_id = :courseId AND title = :title`,
        { replacements: { courseId: COURSE_ID, title: ATTCK_QUIZ_TITLE }, transaction },
      );
      if (quiz.length !== 1) {
        throw new Error(`Expected exactly one "${ATTCK_QUIZ_TITLE}" row to place this after, found ${quiz.length} — refusing to guess.`);
      }
      const orderIndex = quiz[0].order_index + 1;

      const [existing] = await seq.query(
        `SELECT id FROM assignments WHERE course_id = :courseId AND title = :title`,
        { replacements: { courseId: COURSE_ID, title: TITLE }, transaction },
      );
      if (existing.length > 0) {
        const id = existing[0].id;
        const [[{ count: subCount }]] = await seq.query('SELECT count(*)::int AS count FROM submissions WHERE assignment_id = :id', { replacements: { id }, transaction });
        const [[{ count: gradeCount }]] = await seq.query('SELECT count(*)::int AS count FROM grades WHERE assignment_id = :id', { replacements: { id }, transaction });
        if (subCount > 0 || gradeCount > 0) {
          throw new Error(`Refusing to replace "${TITLE}" (id=${id}) — it already has ${subCount} submission(s)/${gradeCount} grade(s). Reseed manually if you're sure.`);
        }
        await seq.query('DELETE FROM assignments WHERE id = :id', { replacements: { id }, transaction });
        console.log(`Deleted prior untouched row (id=${id}) before reseeding.`);
      }

      const questions = buildQuestions();
      const totalPoints = questions.reduce((sum, q) => sum + q.scoring.points, 0);

      await seq.query(
        `INSERT INTO assignments
           (id, course_id, title, description, launch_briefing, max_score, order_index,
            is_published, type, grading_mode, scenario_name, drop_number, questions, role_filters,
            created_at, updated_at)
         VALUES
           (:id, :courseId, :title, :description, :launchBriefing, :maxScore, :orderIndex,
            false, 'challenge', 'squad', NULL, NULL, :questions, ARRAY[]::text[],
            NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            courseId: COURSE_ID,
            title: TITLE,
            description: DESCRIPTION,
            launchBriefing: LAUNCH_BRIEFING,
            maxScore: totalPoints,
            orderIndex,
            questions: JSON.stringify(questions),
          },
          transaction,
        },
      );

      console.log(`Seeded unpublished: "${TITLE}" (${questions.length} items, ${totalPoints} pts, order_index ${orderIndex})`);
    });
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, TITLE };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
