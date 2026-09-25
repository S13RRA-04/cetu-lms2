'use strict';
/**
 * Seed "The Investigator's Toolbox — Quiz Module" as a new, standalone
 * individual-assessment challenge — NOT tied to any packet-heist-v2 drop,
 * NOT replacing the pre-existing "Day 4 Lecture 2" quiz (same lecture topic,
 * different/shorter format, 30 submissions already live on it when this was
 * authored). See day4ToolboxQuizSpec.js's header comment for the full
 * rationale and the user's explicit "add alongside, don't replace" call.
 *
 * Idempotent by title: refuses to reseed if a row with this exact title
 * already exists and has any submissions.
 *
 * Run: node backend/scripts/seed-pact-day4-toolbox-quiz.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const { TITLE, DESCRIPTION, buildQuestions } = require('./lib/day4ToolboxQuizSpec');

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
        `SELECT id FROM assignments WHERE course_id = :courseId AND title = :title`,
        { replacements: { courseId: COURSE_ID, title: TITLE }, transaction },
      );
      if (existing.length > 0) {
        const ids = existing.map((r) => r.id);
        const [[{ count: subCount }]] = await seq.query('SELECT count(*)::int AS count FROM submissions WHERE assignment_id IN (:ids)', { replacements: { ids }, transaction });
        if (subCount > 0) {
          throw new Error(`Refusing to replace "${TITLE}" — ${subCount} submission(s) already exist. Reseed manually if you're sure.`);
        }
        await seq.query('DELETE FROM assignments WHERE id IN (:ids)', { replacements: { ids }, transaction });
        console.log(`Deleted ${ids.length} prior untouched "${TITLE}" row(s) before reseeding.`);
      }

      const [[{ next }]] = await seq.query(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
        { replacements: { courseId: COURSE_ID }, transaction },
      );

      const questions = buildQuestions();
      const maxScore = questions.reduce((sum, q) => sum + (q.kind === 'prompt' ? q.points : q.scoring.points), 0);

      await seq.query(
        `INSERT INTO assignments
           (id, course_id, title, description, type, grading_mode, max_score, order_index,
            is_published, scenario_name, drop_number, victim_name, questions, role_filters,
            created_at, updated_at)
         VALUES
           (:id, :courseId, :title, :description, 'challenge', 'squad', :maxScore, :orderIndex,
            false, NULL, NULL, NULL, :questions, ARRAY[]::text[],
            NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            courseId: COURSE_ID,
            title: TITLE,
            description: DESCRIPTION,
            maxScore,
            orderIndex: Number(next),
            questions: JSON.stringify(questions),
          },
          transaction,
        },
      );
      console.log(`Seeded unpublished: ${TITLE} (${questions.length} items, ${maxScore} pts)`);
    });

    console.log('Done — unpublished, no cohort/squad unlock, doesn\'t touch the existing Day 4 Lecture 2 quiz.');
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, TITLE };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
