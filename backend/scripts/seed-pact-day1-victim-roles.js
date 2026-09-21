'use strict';
/**
 * Seed PACKET HEIST v2 — Drop 1 ("The Victims") per-victim, per-role
 * individual assessment work, plus each victim's squad quiz, transcribed
 * from v2/files (23)/PACT_Day1_Squad_<Victim>_Student.docx and its
 * _InstructorKey.docx counterpart.
 *
 * Structure per victim (matches the docx worksheets exactly):
 *   - 7 professional-role assignments (SA/IA/DA/FoA/SOS/TFO/CS), each with
 *     3 multiple-choice + 1-2 fill-in-the-blank + 1 short-answer prompt,
 *     grading_mode:'individual', role_filters:[<role>], victim_name set —
 *     same shape as the existing Drop 7 role-tasking assignments.
 *   - 1 squad-quiz assignment (5 multiple-choice, grading_mode:'squad'),
 *     done together after every role finishes its individual work.
 *
 * A few items in the docx ask for two blanks in one sentence (e.g. "on May
 * ___ and June ___"); FillBlank only supports a single blank, so those are
 * written as a short prompt instead (see DUAL_BLANK_AS_PROMPT below) rather
 * than forcing two values into one text input.
 *
 * Run: node backend/scripts/seed-pact-day1-victim-roles.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const { SCENARIO, DROP, buildAssignmentSpecs } = require('./lib/day1VictimRoleSpecs');

async function insertAssignment(seq, transaction, { title, description, victimName, roleFilters, gradingMode, questions, orderIndex }) {
  const maxScore = questions.reduce((sum, q) => sum + (q.kind === 'prompt' ? q.points : q.scoring.points), 0);
  await seq.query(
    `INSERT INTO assignments
       (id, course_id, title, description, type, grading_mode, max_score, order_index,
        is_published, scenario_name, drop_number, victim_name, questions, role_filters,
        created_at, updated_at)
     VALUES
       (:id, :courseId, :title, :description, 'challenge', :gradingMode, :maxScore, :orderIndex,
        false, :scenario, :drop, :victimName, :questions, ARRAY[:roleFilters]::text[],
        NOW(), NOW())`,
    {
      replacements: {
        id: uuidv4(),
        courseId: COURSE_ID,
        title,
        description,
        gradingMode,
        maxScore,
        orderIndex,
        scenario: SCENARIO,
        drop: DROP,
        victimName,
        questions: JSON.stringify(questions),
        roleFilters,
      },
      transaction,
    },
  );
  console.log(`Seeded unpublished: ${title} (${questions.length} items, ${maxScore} pts)`);
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
      const [existing] = await seq.query(
        `SELECT id FROM assignments WHERE course_id = :courseId AND scenario_name = :scenario AND drop_number = :drop`,
        { replacements: { courseId: COURSE_ID, scenario: SCENARIO, drop: DROP }, transaction },
      );
      if (existing.length > 0) {
        const ids = existing.map((r) => r.id);
        const [[{ count: subCount }]] = await seq.query('SELECT count(*)::int AS count FROM submissions WHERE assignment_id IN (:ids)', { replacements: { ids }, transaction });
        if (subCount > 0) {
          throw new Error(`Refusing to replace Drop 1 v2 assignments — ${subCount} submission(s) already exist. Reseed manually if you're sure.`);
        }
        await seq.query('DELETE FROM assignments WHERE id IN (:ids)', { replacements: { ids }, transaction });
        console.log(`Deleted ${ids.length} prior untouched Drop 1 v2 assignment(s) before reseeding.`);
      }

      const [[{ next }]] = await seq.query(
        "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
        { replacements: { courseId: COURSE_ID }, transaction },
      );
      let orderIndex = Number(next);

      for (const spec of buildAssignmentSpecs()) {
        await insertAssignment(seq, transaction, { ...spec, orderIndex: orderIndex++ });
      }
    });

    console.log(`Seeded Drop 1 v2 role + squad-quiz assignments for 4 victims, all unpublished.`);
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
