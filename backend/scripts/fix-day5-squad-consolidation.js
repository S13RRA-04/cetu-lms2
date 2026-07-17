'use strict';
/**
 * One-off data fix for the Day 5 testimony-prep assignments (seeded by
 * seed-day5-testimony-prep.js) after they were switched from
 * grading_mode: 'individual' to grading_mode: 'squad'.
 *
 * Some students may have already worked these assignments individually
 * before the switch, leaving per-user Submission.progress/quiz_state and
 * Grade.score rows that no longer reflect "squad" semantics. This script
 * consolidates each squad's members onto shared values:
 *
 *  - Progress: the furthest-progressed member's Submission (progress,
 *    quiz_state, status, content, submitted_at) is copied onto every squad
 *    member's own row (creating one where a member has none yet), matching
 *    the fan-out pattern submission.service.js's submit() already uses for
 *    sharedRoleTasking assignments.
 *  - Score: the highest-scoring member's Grade is fanned out to every squad
 *    member's own row, same as grade.service.js's gradeSquad()/autoGradeQuiz()
 *    already do for squad-graded assignments going forward. No individual
 *    member keeps a different score than their squad after this runs.
 *
 * Run: node backend/scripts/fix-day5-squad-consolidation.js
 */
require('dotenv').config();
const { Op } = require('sequelize');
const { Assignment, Submission, Grade, Enrollment, User, sequelize } = require('../src/models');
const { ALL_ASSIGNMENTS } = require('./seed-day5-testimony-prep');

const STATUS_RANK = { in_progress: 0, submitted: 1, graded: 2, returned: 3 };

function furthestSubmission(subs) {
  return subs.reduce((best, s) => {
    if (!best) return s;
    if (s.progress !== best.progress) return s.progress > best.progress ? s : best;
    const rankDiff = (STATUS_RANK[s.status] ?? 0) - (STATUS_RANK[best.status] ?? 0);
    if (rankDiff !== 0) return rankDiff > 0 ? s : best;
    return new Date(s.updated_at) > new Date(best.updated_at) ? s : best;
  }, null);
}

function bestGrade(grades) {
  return grades.reduce((best, g) => {
    if (!best) return g;
    const bestPct = best.max_score > 0 ? best.score / best.max_score : 0;
    const gPct    = g.max_score    > 0 ? g.score    / g.max_score    : 0;
    if (gPct !== bestPct) return gPct > bestPct ? g : best;
    return g.score > best.score ? g : best;
  }, null);
}

async function consolidateAssignment(assignment) {
  const submissions = await Submission.findAll({ where: { assignment_id: assignment.id } });
  const grades      = await Grade.findAll({ where: { assignment_id: assignment.id } });

  // Staff accounts (admin/instructor) sometimes sit inside a student squad
  // for preview/testing — exclude them from squad membership so their own
  // activity never becomes the squad's "furthest progress"/"best grade" and
  // never receives the fan-out either.
  const enrollments = await Enrollment.findAll({
    where: { course_id: assignment.course_id, squad_id: { [Op.ne]: null } },
    include: [{ model: User, where: { role: 'student' }, attributes: [] }],
  });
  const squadByUser = new Map(enrollments.map((e) => [e.user_id, e.squad_id]));

  const squadIds = new Set([
    ...submissions.map((s) => s.squad_id).filter(Boolean),
    ...grades.map((g) => squadByUser.get(g.user_id)).filter(Boolean),
  ]);

  let squadsTouched = 0, submissionsWritten = 0, gradesWritten = 0;

  for (const squadId of squadIds) {
    const members = enrollments.filter((e) => e.squad_id === squadId);
    if (members.length === 0) continue;
    const memberIds = members.map((e) => e.user_id);

    await sequelize.transaction(async (t) => {
      const squadSubs = submissions.filter((s) => memberIds.includes(s.user_id));
      const furthest  = furthestSubmission(squadSubs);
      if (furthest) {
        for (const uid of memberIds) {
          const [sub] = await Submission.findOrCreate({
            where:    { assignment_id: assignment.id, user_id: uid },
            defaults: {
              squad_id: squadId, progress: furthest.progress, quiz_state: furthest.quiz_state,
              status: furthest.status, content: furthest.content, submitted_at: furthest.submitted_at,
            },
            transaction: t,
          });
          await sub.update({
            squad_id: squadId, progress: furthest.progress, quiz_state: furthest.quiz_state,
            status: furthest.status, content: furthest.content, submitted_at: furthest.submitted_at,
          }, { transaction: t });
          submissionsWritten += 1;
        }
      }

      const squadGrades = grades.filter((g) => memberIds.includes(g.user_id));
      const best = bestGrade(squadGrades);
      if (best) {
        for (const uid of memberIds) {
          const [grade, created] = await Grade.findOrCreate({
            where:    { assignment_id: assignment.id, user_id: uid },
            defaults: {
              score: best.score, max_score: best.max_score, feedback: best.feedback,
              graded_at: best.graded_at, graded_by: best.graded_by, prompt_scores: best.prompt_scores,
            },
            transaction: t,
          });
          if (!created) {
            await grade.update({
              score: best.score, max_score: best.max_score, feedback: best.feedback,
              graded_at: best.graded_at, graded_by: best.graded_by, prompt_scores: best.prompt_scores,
            }, { transaction: t });
          }
          gradesWritten += 1;
        }
      }
    });

    squadsTouched += 1;
  }

  return { squadsTouched, submissionsWritten, gradesWritten };
}

async function main() {
  const titles = ALL_ASSIGNMENTS.map((a) => a.title);
  const assignments = await Assignment.findAll({ where: { title: titles } });

  if (assignments.length === 0) {
    console.log('No Day 5 assignments found — run seed-day5-testimony-prep.js first.');
    return;
  }

  for (const assignment of assignments) {
    const result = await consolidateAssignment(assignment);
    console.log(
      `${assignment.title}: ${result.squadsTouched} squad(s), ` +
      `${result.submissionsWritten} submission row(s), ${result.gradesWritten} grade row(s) written.`
    );
  }

  console.log('\nDone. Note: scoreboardCache/gradesCache in the running server hold data for up to 20s — ' +
    'either wait for TTL expiry or restart the server to see updated totals immediately.');
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };
