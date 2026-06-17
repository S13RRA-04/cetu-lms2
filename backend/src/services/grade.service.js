'use strict';
const { Grade, Assignment, User, Enrollment, Squad } = require('../models');
const { NotFoundError, AppError }                    = require('../utils/errors');
const ltiService                                     = require('./lti.service');
const logger                                         = require('../utils/logger');

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

  const student = await User.findByPk(userId);
  if (!student) throw new NotFoundError('User');

  const [grade, created] = await Grade.findOrCreate({
    where:    { assignment_id: assignmentId, user_id: userId },
    defaults: {
      score:     data.score,
      max_score: assignment.max_score,
      feedback:  data.feedback || null,
      graded_at: new Date(),
      graded_by: graderId,
    },
  });

  if (!created) {
    await grade.update({
      score:     data.score,
      max_score: assignment.max_score,
      feedback:  data.feedback ?? grade.feedback,
      graded_at: new Date(),
      graded_by: graderId,
    });
  }

  // Attempt async AGS passback if assignment has a lineitem_url
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
  if (assignment.grading_mode !== 'squad') throw new AppError('Assignment is not squad-graded', 400, 'BAD_REQUEST');

  const squad = await Squad.findByPk(squadId);
  if (!squad) throw new NotFoundError('Squad');

  const enrollments = await Enrollment.findAll({ where: { cell_id: squadId, course_id: assignment.course_id } });
  if (enrollments.length === 0) throw new AppError('No members found in squad for this course', 400, 'BAD_REQUEST');

  const grades = await Promise.all(enrollments.map(async (e) => {
    const [grade, created] = await Grade.findOrCreate({
      where:    { assignment_id: assignmentId, user_id: e.user_id },
      defaults: { score: data.score, max_score: assignment.max_score, feedback: data.feedback || null, graded_at: new Date(), graded_by: graderId },
    });
    if (!created) await grade.update({ score: data.score, max_score: assignment.max_score, feedback: data.feedback ?? grade.feedback, graded_at: new Date(), graded_by: graderId });

    if (assignment.lineitem_url) {
      ltiService.publishGradeAsync(assignment, e.user_id, data.score).catch((err) => {
        logger.error('Background AGS passback failed', { error: err.message, userId: e.user_id });
      });
    }
    return grade;
  }));

  return grades;
}

async function getScoreboard(courseId) {
  const { sequelize } = require('../config/database');
  const [rows] = await sequelize.query(
    `SELECT u.id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName",
            COALESCE(SUM(g.score), 0)     AS "totalScore",
            COALESCE(SUM(g.max_score), 0) AS "maxScore",
            COUNT(g.id)                   AS "graded"
     FROM enrollments e
     JOIN users u ON u.id = e.user_id
     LEFT JOIN grades g ON g.user_id = e.user_id
       AND g.assignment_id IN (SELECT id FROM assignments WHERE course_id = :courseId)
     WHERE e.course_id = :courseId AND u.role = 'student'
     GROUP BY u.id, u.first_name, u.last_name
     ORDER BY "totalScore" DESC`,
    { replacements: { courseId } }
  );
  return rows.map((r) => ({
    userId:     r.userId,
    firstName:  r.firstName,
    lastName:   r.lastName,
    totalScore: Math.round(parseFloat(r.totalScore)),
    maxScore:   Math.round(parseFloat(r.maxScore)),
    graded:     parseInt(r.graded, 10),
  }));
}

async function getCourseGrades(courseId, cohortId) {
  const { sequelize } = require('../config/database');
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

module.exports = { getGradesForAssignment, getGradesForUser, upsertGrade, gradeSquad, getScoreboard, getCourseGrades };
