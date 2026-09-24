'use strict';
/**
 * Seed the Day 4, 1030 "Attribution Workshop" — see
 * lib/day4AttributionWorkshopSpec.js for the full content/rationale.
 *
 * Updates the pre-existing empty "Day 4 AM Workshop: Attribution Synthesis"
 * stub (order_index 17) in place rather than duplicating it — confirmed live
 * before writing this script that it had 0 submissions/grades and was never
 * published. Clears its stale scenario_name ('brokered-exit')/drop_number
 * (4), since this content is a standalone public case, not evidence tied to
 * any training scenario/drop.
 *
 * Run: node backend/scripts/seed-pact-day4-attribution-workshop.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { TITLE, EXISTING_ID, LAUNCH_BRIEFING, DESCRIPTION, buildQuestions } = require('./lib/day4AttributionWorkshopSpec');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

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
      const [existing] = await seq.query(
        `SELECT id FROM assignments WHERE id = :id AND course_id = :courseId AND title = :title`,
        { replacements: { id: EXISTING_ID, courseId: COURSE_ID, title: TITLE }, transaction },
      );
      if (existing.length === 0) {
        throw new Error(`Expected existing stub row id=${EXISTING_ID} titled "${TITLE}" was not found — refusing to guess. Check the row manually before reseeding.`);
      }
      const [[{ count: subCount }]] = await seq.query('SELECT count(*)::int AS count FROM submissions WHERE assignment_id = :id', { replacements: { id: EXISTING_ID }, transaction });
      const [[{ count: gradeCount }]] = await seq.query('SELECT count(*)::int AS count FROM grades WHERE assignment_id = :id', { replacements: { id: EXISTING_ID }, transaction });
      if (subCount > 0 || gradeCount > 0) {
        throw new Error(`Refusing to overwrite "${TITLE}" (id=${EXISTING_ID}) — it already has ${subCount} submission(s)/${gradeCount} grade(s). Reseed manually if you're sure.`);
      }

      const questions = buildQuestions();
      const totalPoints = questions.reduce((sum, q) => sum + (q.kind === 'prompt' ? q.points : q.scoring.points), 0);

      await seq.query(
        `UPDATE assignments
         SET description = :description,
             launch_briefing = :launchBriefing,
             max_score = :maxScore,
             questions = :questions,
             scenario_name = NULL,
             drop_number = NULL,
             updated_at = NOW()
         WHERE id = :id`,
        {
          replacements: {
            id: EXISTING_ID,
            description: DESCRIPTION,
            launchBriefing: LAUNCH_BRIEFING,
            maxScore: totalPoints,
            questions: JSON.stringify(questions),
          },
          transaction,
        },
      );

      console.log(`Updated "${TITLE}" (id=${EXISTING_ID}): ${questions.length} items, ${totalPoints} pts. Still unpublished — scenario_name/drop_number cleared.`);
    });
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, TITLE, EXISTING_ID };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
