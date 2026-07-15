'use strict';
const { Grade, Assignment, User, Enrollment, Squad, Submission } = require('../models');
const { NotFoundError, AppError }                    = require('../utils/errors');
const ltiService                                     = require('./lti.service');
const logger                                         = require('../utils/logger');
const { sequelize }                                  = require('../config/database');
const TtlCache                                       = require('../utils/ttlCache');

// Scoreboard changes only when grades are upserted — cache for 20 s to absorb
// the thundering-herd of 35 students loading simultaneously.
const scoreboardCache = new TtlCache(20_000);

// Squad scoreboard and the admin gradebook query are both raw-SQL and hit
// repeatedly during live grading/leaderboard checks — short TTL, no
// invalidation needed (same trade-off as assignment.service.js's admin listCache).
const gradesCache = new TtlCache(15_000);

async function getGradesForAssignment(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  return Grade.findAll({
    where:   { assignment_id: assignmentId },
    include: [{ model: User, as: 'student', attributes: ['id', 'email', 'first_name', 'last_name'] }],
    order:   [['created_at', 'DESC']],
  });
}

async function getGradesForUser(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundError('User');

  return Grade.findAll({
    where:   { user_id: userId },
    include: [{ model: Assignment, attributes: ['id', 'title', 'max_score', 'due_date', 'course_id'] }],
    order:   [['graded_at', 'DESC']],
  });
}

async function upsertGrade(assignmentId, userId, data, graderId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');
  if (data.score > assignment.max_score) throw new AppError('Score cannot exceed assignment maximum', 400, 'BAD_REQUEST');

  const student = await User.findByPk(userId);
  if (!student) throw new NotFoundError('User');

  const grade = await sequelize.transaction(async (t) => {
    const [g, created] = await Grade.findOrCreate({
      where:    { assignment_id: assignmentId, user_id: userId },
      defaults: {
        score:         data.score,
        max_score:     assignment.max_score,
        feedback:      data.feedback || null,
        prompt_scores: data.promptScores ?? null,
        graded_at:     new Date(),
        graded_by:     graderId,
      },
      transaction: t,
    });
    if (!created) {
      await g.update({
        score:         data.score,
        max_score:     assignment.max_score,
        feedback:      data.feedback ?? g.feedback,
        prompt_scores: data.promptScores ?? g.prompt_scores,
        graded_at:     new Date(),
        graded_by:     graderId,
      }, { transaction: t });
    }
    await Submission.update(
      { status: 'graded' },
      { where: { assignment_id: assignmentId, user_id: userId, status: 'submitted' }, transaction: t }
    );
    return g;
  });

  // Invalidate scoreboard cache so the next fetch reflects this grade
  scoreboardCache.invalidate(`scoreboard:${assignment.course_id}`);

  // Fire-and-forget AGS passback (outside transaction — non-critical)
  if (assignment.lineitem_url) {
    ltiService.publishGradeAsync(assignment, userId, data.score).catch((err) => {
      logger.error('Background AGS passback failed', { error: err.message });
    });
  }

  return grade.reload({
    include: [{ model: User, as: 'student', attributes: ['id', 'email', 'first_name', 'last_name'] }],
  });
}

async function gradeSquad(assignmentId, squadId, data, graderId) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');
  if (data.score > assignment.max_score) throw new AppError('Score cannot exceed assignment maximum', 400, 'BAD_REQUEST');
  if (assignment.grading_mode !== 'squad') throw new AppError('Assignment is not squad-graded', 400, 'BAD_REQUEST');

  const squad = await Squad.findByPk(squadId);
  if (!squad) throw new NotFoundError('Squad');

  const enrollments = await Enrollment.findAll({ where: { squad_id: squadId, course_id: assignment.course_id } });
  if (enrollments.length === 0) throw new AppError('No members found in squad for this course', 400, 'BAD_REQUEST');

  const grades = await sequelize.transaction(async (t) => {
    const gs = await Promise.all(enrollments.map(async (e) => {
      const [grade, created] = await Grade.findOrCreate({
        where:    { assignment_id: assignmentId, user_id: e.user_id },
        defaults: { score: data.score, max_score: assignment.max_score, feedback: data.feedback || null, prompt_scores: data.promptScores ?? null, graded_at: new Date(), graded_by: graderId },
        transaction: t,
      });
      if (!created) {
        await grade.update({ score: data.score, max_score: assignment.max_score, feedback: data.feedback ?? grade.feedback, prompt_scores: data.promptScores ?? grade.prompt_scores, graded_at: new Date(), graded_by: graderId }, { transaction: t });
      }
      return grade;
    }));
    await Submission.update(
      { status: 'graded' },
      { where: { assignment_id: assignmentId, squad_id: squadId, status: 'submitted' }, transaction: t }
    );
    return gs;
  });

  // Fire-and-forget AGS passback (outside transaction — non-critical)
  if (assignment.lineitem_url) {
    for (const e of enrollments) {
      ltiService.publishGradeAsync(assignment, e.user_id, data.score).catch((err) => {
        logger.error('Background AGS passback failed', { error: err.message, userId: e.user_id });
      });
    }
  }

  return grades;
}

/* Single entry point for auto-grading a quiz-style submission (QuizFlow embeds
   totalScore/maxScore in the submitted content — see submission.service.js's
   submit()). This is the ONLY place that should ever write a Grade as a
   result of a student's own submission, precisely so squad-vs-individual
   fan-out can't drift out of sync the way it did before: a squad-graded
   challenge's score belongs to the whole squad, not just whichever member
   happened to click submit, exactly like the instructor-driven gradeSquad()
   above. Individually-graded assignments still land on just the one user. */
async function autoGradeQuiz(assignment, userId, squadId, score, maxScore) {
  const targetUserIds = (assignment.grading_mode === 'squad' && squadId)
    ? (await Enrollment.findAll({ where: { squad_id: squadId, course_id: assignment.course_id }, attributes: ['user_id'] })).map((e) => e.user_id)
    : [userId];

  const grades = await sequelize.transaction(async (t) => {
    return Promise.all(targetUserIds.map(async (uid) => {
      const [grade, created] = await Grade.findOrCreate({
        where:    { assignment_id: assignment.id, user_id: uid },
        defaults: { score, max_score: maxScore, graded_at: new Date(), graded_by: null },
        transaction: t,
      });
      if (!created) {
        // Keep the squad/student's best attempt — a resubmission should never
        // silently overwrite a better grade with a worse one.
        const existingPct = grade.max_score > 0 ? grade.score / grade.max_score : 0;
        const newPct       = maxScore       > 0 ? score / maxScore              : 0;
        if (newPct >= existingPct) {
          await grade.update({ score, max_score: maxScore, graded_at: new Date() }, { transaction: t });
        }
      }
      return grade;
    }));
  });

  scoreboardCache.invalidate(`scoreboard:${assignment.course_id}`);

  if (assignment.lineitem_url) {
    for (const uid of targetUserIds) {
      ltiService.publishGradeAsync(assignment, uid, score).catch((err) => {
        logger.error('Background AGS passback failed for quiz auto-grade', { error: err.message, userId: uid });
      });
    }
  }

  return grades;
}

async function getScoreboard(courseId) {
  return scoreboardCache.get(`scoreboard:${courseId}`, () => _queryScoreboard(courseId));
}

async function _queryScoreboard(courseId) {
  // Individual ("Operators") standings must reflect personal performance only —
  // grades from squad-graded assignments belong to the Squad standings
  // (getSquadScoreboard below), not a student's own ranking. Without this
  // filter, a squad's shared score would double-count into every member's
  // individual total on top of counting once for their squad.
  const [rows] = await sequelize.query(
    `SELECT u.id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName",
            COALESCE(SUM(g.score), 0)     AS "totalScore",
            COALESCE(SUM(g.max_score), 0) AS "maxScore",
            COALESCE(puzzle_points.points, 0) AS "puzzlePoints",
            COUNT(g.id)                   AS "graded"
     FROM enrollments e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN grades g ON g.user_id = e.user_id
       AND g.assignment_id IN (SELECT id FROM assignments WHERE course_id = :courseId AND grading_mode != 'squad')
     LEFT JOIN (
       SELECT first_solver_id, SUM(points_awarded) AS points
       FROM squad_puzzle_completions
       WHERE course_id = :courseId
       GROUP BY first_solver_id
     ) puzzle_points ON puzzle_points.first_solver_id = u.id
     WHERE e.course_id = :courseId AND u.role = 'student'
     GROUP BY u.id, u.first_name, u.last_name, puzzle_points.points
     ORDER BY "totalScore" DESC`,
    { replacements: { courseId } }
  );
  return rows.map((r) => ({
    userId:     r.userId,
    firstName:  r.firstName,
    lastName:   r.lastName,
    totalScore: Math.round(parseFloat(r.totalScore) + parseFloat(r.puzzlePoints ?? 0)),
    maxScore:   Math.round(parseFloat(r.maxScore)),
    graded:     parseInt(r.graded, 10),
  }));
}

async function getSquadScoreboard(courseId) {
  return gradesCache.get(`squadScoreboard:${courseId}`, () => _querySquadScoreboard(courseId));
}

async function _querySquadScoreboard(courseId) {
  // Pick one representative enrollment per squad (DISTINCT ON so grades are
  // counted once per squad, not per member). The possible-score denominator is
  // every squad assignment unlocked for that squad at this point in the game:
  // cohort-wide unlocks plus that squad's scoped unlocks. The DISTINCT eligible
  // CTE prevents a redundant cohort + squad unlock from double-counting points.
  const [rows] = await sequelize.query(
    `WITH rep AS (
       SELECT DISTINCT ON (e.squad_id) e.squad_id, e.user_id
       FROM enrollments e
       WHERE e.course_id = :courseId AND e.squad_id IS NOT NULL
       ORDER BY e.squad_id, e.user_id
     ), eligible AS (
       SELECT DISTINCT s.id AS squad_id, au.assignment_id
       FROM squads s
       JOIN assignment_unlocks au
         ON au.cohort_id = s.cohort_id
        AND (au.squad_id IS NULL OR au.squad_id = s.id)
       JOIN assignments unlocked_assignment
         ON unlocked_assignment.id = au.assignment_id
        AND unlocked_assignment.course_id = :courseId
        AND unlocked_assignment.grading_mode = 'squad'
     )
     SELECT s.id           AS "squadId",
            s.number       AS "squadNumber",
            s.name         AS "squadName",
            COALESCE(SUM(g.score),     0) AS "totalScore",
            COALESCE(SUM(a.max_score), 0) AS "maxScore",
            COUNT(g.id)                   AS "graded",
            COUNT(a.id)                   AS "available"
     FROM squads s
     JOIN rep ON rep.squad_id = s.id
     JOIN eligible el ON el.squad_id = s.id
     JOIN assignments a ON a.id = el.assignment_id
     LEFT JOIN grades g ON g.assignment_id = a.id AND g.user_id = rep.user_id
     GROUP BY s.id, s.number, s.name
     ORDER BY "totalScore" DESC`,
    { replacements: { courseId } }
  );
  return rows.map((r) => ({
    squadId:     r.squadId,
    squadNumber: parseInt(r.squadNumber, 10),
    squadName:   r.squadName ?? null,
    totalScore:  Math.round(parseFloat(r.totalScore)),
    maxScore:    Math.round(parseFloat(r.maxScore)),
    graded:      parseInt(r.graded, 10),
    available:   parseInt(r.available, 10),
  }));
}

async function getCourseGrades(courseId, cohortId) {
  return gradesCache.get(`courseGrades:${courseId}:${cohortId ?? 'all'}`, () => _queryCourseGrades(courseId, cohortId));
}

async function _queryCourseGrades(courseId, cohortId) {
  const [rows] = await sequelize.query(
    `SELECT
       u.id           AS "userId",
       u.first_name   AS "firstName",
       u.last_name    AS "lastName",
       u.email,
       e.cohort_id    AS "cohortId",
       co.name        AS "cohortName",
       a.id           AS "assignmentId",
       a.title        AS "assignmentTitle",
       a.max_score    AS "assignmentMax",
       a.order_index  AS "orderIndex",
       g.score,
       g.max_score    AS "gradeMax",
       g.feedback,
       g.graded_at    AS "gradedAt",
       s.status       AS "submissionStatus",
       s.progress     AS "submissionProgress"
     FROM enrollments e
     JOIN users u ON u.id = e.user_id AND u.role = 'student'
     JOIN assignments a ON a.course_id = :courseId AND a.is_published = true
     LEFT JOIN cohorts co ON co.id = e.cohort_id
     LEFT JOIN grades g ON g.user_id = e.user_id AND g.assignment_id = a.id
     LEFT JOIN submissions s ON s.user_id = e.user_id AND s.assignment_id = a.id
     WHERE e.course_id = :courseId
       AND (:cohortId IS NULL OR e.cohort_id = :cohortId::uuid)
     ORDER BY co.name NULLS LAST, u.last_name, u.first_name, a.order_index, a.created_at`,
    { replacements: { courseId, cohortId: cohortId ?? null } }
  );
  return rows;
}

module.exports = { getGradesForAssignment, getGradesForUser, upsertGrade, gradeSquad, autoGradeQuiz, getScoreboard, getSquadScoreboard, getCourseGrades };
