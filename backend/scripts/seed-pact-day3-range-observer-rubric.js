'use strict';
/**
 * Seed the Day 3 PM Range Practical squad-lead performance rubric — see
 * lib/day3RangeObserverRubricSpec.js for the full content/rationale.
 *
 * This assignment is instructor/observer-only: students never open or
 * submit it. To make it appear in the Grade Center's squad-grading flow
 * (which is driven off Submission rows — see AdminPage.jsx's groupBySquad),
 * this script also seeds one placeholder Submission per squad in a given
 * cohort, tagged { rangeObserverRubric: true } in its content so the
 * frontend renders RangeObserverRubricGrading instead of a normal
 * deliverable/quiz review. The placeholder's user_id is an arbitrary active
 * squad member (Submission requires one) — gradeSquad() fans the resulting
 * grade out to every current squad member regardless of which one is on
 * that row, exactly as it does for every other squad-graded assignment.
 *
 * Run: node backend/scripts/seed-pact-day3-range-observer-rubric.js <cohortId>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { TITLE, LAUNCH_BRIEFING, DESCRIPTION, buildQuestions } = require('./lib/day3RangeObserverRubricSpec');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

async function main() {
  const cohortId = process.argv[2];
  if (!cohortId) throw new Error('Usage: node seed-pact-day3-range-observer-rubric.js <cohortId>');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');

  const seq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });

  try {
    await seq.authenticate();

    const [[cohort]] = await seq.query('SELECT id, name FROM cohorts WHERE id = :cohortId AND course_id = :courseId', { replacements: { cohortId, courseId: COURSE_ID } });
    if (!cohort) throw new Error(`Cohort ${cohortId} not found under course ${COURSE_ID}`);

    await seq.transaction(async (transaction) => {
      let [[existing]] = await seq.query('SELECT id FROM assignments WHERE course_id = :courseId AND title = :title', { replacements: { courseId: COURSE_ID, title: TITLE }, transaction });

      const questions = buildQuestions();
      const maxScore = Number(questions.reduce((sum, q) => sum + q.points, 0).toFixed(2));

      let assignmentId;
      if (existing) {
        assignmentId = existing.id;
        await seq.query(
          `UPDATE assignments SET description = :description, launch_briefing = :launchBriefing, max_score = :maxScore, questions = :questions, updated_at = NOW() WHERE id = :id`,
          { replacements: { id: assignmentId, description: DESCRIPTION, launchBriefing: LAUNCH_BRIEFING, maxScore, questions: JSON.stringify(questions) }, transaction },
        );
        console.log(`Updated existing "${TITLE}" (id=${assignmentId}): ${questions.length} criteria, ${maxScore} weighted pts max.`);
      } else {
        assignmentId = uuidv4();
        const [[{ next }]] = await seq.query(
          "SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM assignments WHERE course_id = :courseId AND type = 'challenge'",
          { replacements: { courseId: COURSE_ID }, transaction },
        );
        await seq.query(
          `INSERT INTO assignments
             (id, course_id, title, description, launch_briefing, type, grading_mode, max_score, order_index,
              is_published, questions, created_at, updated_at)
           VALUES
             (:id, :courseId, :title, :description, :launchBriefing, 'challenge', 'squad', :maxScore, :orderIndex,
              false, :questions, NOW(), NOW())`,
          {
            replacements: {
              id: assignmentId, courseId: COURSE_ID, title: TITLE, description: DESCRIPTION,
              launchBriefing: LAUNCH_BRIEFING, maxScore, orderIndex: Number(next), questions: JSON.stringify(questions),
            },
            transaction,
          },
        );
        console.log(`Created "${TITLE}" (id=${assignmentId}): ${questions.length} criteria, ${maxScore} weighted pts max. Unpublished.`);
      }

      const squads = await seq.query('SELECT id, number FROM squads WHERE cohort_id = :cohortId ORDER BY number', { replacements: { cohortId }, transaction, type: Sequelize.QueryTypes.SELECT });
      if (squads.length === 0) {
        console.log(`No squads found for cohort "${cohort.name}" — assignment seeded, but no placeholder submissions to create yet.`);
        return;
      }

      let created = 0, skipped = 0;
      for (const squad of squads) {
        const [[rep]] = await seq.query(
          `SELECT e.user_id FROM enrollments e JOIN users u ON u.id = e.user_id
           WHERE e.squad_id = :squadId AND e.course_id = :courseId AND e.status = 'active' AND u.role = 'student' AND u.is_active = true
           ORDER BY u.last_name LIMIT 1`,
          { replacements: { squadId: squad.id, courseId: COURSE_ID }, transaction },
        );
        if (!rep) { console.log(`  Squad ${squad.number}: no active enrolled student found — skipped.`); skipped++; continue; }

        const [[alreadyExists]] = await seq.query(
          'SELECT id FROM submissions WHERE assignment_id = :assignmentId AND squad_id = :squadId',
          { replacements: { assignmentId, squadId: squad.id }, transaction },
        );
        if (alreadyExists) { skipped++; continue; }

        await seq.query(
          `INSERT INTO submissions (id, assignment_id, user_id, squad_id, content, submitted_at, status, progress, created_at, updated_at)
           VALUES (:id, :assignmentId, :userId, :squadId, :content, NOW(), 'submitted', 100, NOW(), NOW())`,
          { replacements: { id: uuidv4(), assignmentId, userId: rep.user_id, squadId: squad.id, content: JSON.stringify({ rangeObserverRubric: true }) }, transaction },
        );
        created++;
      }
      console.log(`Placeholder submissions: ${created} created, ${skipped} skipped (already existed or no eligible member) — cohort "${cohort.name}", ${squads.length} squad(s).`);
    });
  } finally {
    await seq.close();
  }
}

module.exports = { COURSE_ID, TITLE };

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
