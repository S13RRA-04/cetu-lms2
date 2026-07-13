'use strict';
const { Op }             = require('sequelize');
const { Assignment, AssignmentUnlock, Course, Cohort, Enrollment, User, Submission, CourseContentItem, CourseContentUnlock } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const { paginate, paginatedResponse } = require('../utils/pagination');
const TtlCache = require('../utils/ttlCache');

// Admin assignment list is the same for every instructor request.
// 15-second TTL absorbs thundering-herd without hiding new submissions long.
const listCache = new TtlCache(15_000);

// Per-student assignment list — hit on every dashboard/AppShell load. Short TTL,
// invalidated on the student's own submit/progress writes (see submission.service.js).
const studentListCache = new TtlCache(10_000);

function invalidateStudentCache(courseId, userId) {
  studentListCache.invalidate(`listForStudent:${courseId}:${userId}`);
}

async function listByCourse(courseId, query, { includeUnpublished = false } = {}) {
  const { limit, offset, page } = paginate(query);
  const cacheKey = `listByCourse:${includeUnpublished ? 'all' : 'published'}:${courseId}:${limit}:${offset}`;
  return listCache.get(cacheKey, () => _queryListByCourse(courseId, { limit, offset, page, includeUnpublished }));
}

async function _queryListByCourse(courseId, { limit, offset, page, includeUnpublished = false }) {
  const where = { course_id: courseId };
  if (!includeUnpublished) where.is_published = true;

  const { rows, count } = await Assignment.findAndCountAll({
    where,
    include: [{ model: AssignmentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
    limit, offset,
    order: [['order_index', 'ASC'], ['created_at', 'ASC']],
  });

  if (rows.length > 0) {
    const assignmentIds = rows.map((r) => r.id);
    const subs = await Submission.findAll({
      where:      { assignment_id: assignmentIds, status: { [Op.in]: ['submitted', 'graded'] } },
      attributes: ['assignment_id', 'status'],
    });
    const pendingMap = {};
    const gradedMap  = {};
    for (const s of subs) {
      if (s.status === 'submitted') pendingMap[s.assignment_id] = (pendingMap[s.assignment_id] ?? 0) + 1;
      else                          gradedMap[s.assignment_id]  = (gradedMap[s.assignment_id]  ?? 0) + 1;
    }
    for (const r of rows) {
      r.dataValues.pending_count = pendingMap[r.id] ?? 0;
      r.dataValues.graded_count  = gradedMap[r.id]  ?? 0;
    }
  }

  return paginatedResponse(rows, count, { page, limit });
}

async function listForStudent(courseId, userId) {
  return studentListCache.get(`listForStudent:${courseId}:${userId}`, () => _queryListForStudent(courseId, userId));
}

async function _queryListForStudent(courseId, userId) {
  // Round-trip 1: enrollment and assignment list are independent — run in parallel
  const [enrollment, assignments] = await Promise.all([
    Enrollment.findOne({
      where:   { user_id: userId, course_id: courseId },
      include: [{ association: 'squad', attributes: ['id'] }],
    }),
    Assignment.findAll({
      where: { course_id: courseId, is_published: true },
      order: [['order_index', 'ASC'], ['created_at', 'ASC']],
    }),
  ]);
  if (!enrollment) throw new AppError('Not enrolled in this course', 403, 'FORBIDDEN');

  const squadId   = enrollment.squad?.id ?? null;
  const orClauses = [{ cohort_id: enrollment.cohort_id, squad_id: null }];
  if (squadId) orClauses.push({ squad_id: squadId });

  // Round-trip 2: unlocks (needs enrollment) + submissions (needs assignment IDs) — run in parallel
  const assignmentIds = assignments.map((a) => a.id);
  const [unlocks, submissions] = await Promise.all([
    AssignmentUnlock.findAll({ where: { [Op.or]: orClauses } }),
    assignmentIds.length
      ? Submission.findAll({ where: { assignment_id: assignmentIds, user_id: userId }, attributes: ['assignment_id', 'progress', 'status'] })
      : [],
  ]);

  const unlockedIds = new Set(unlocks.map((u) => u.assignment_id));
  const progressMap = Object.fromEntries(submissions.map((s) => [s.assignment_id, s.progress ?? 0]));

  return assignments.map((a) => ({
    ...a.toJSON(),
    is_unlocked: unlockedIds.has(a.id),
    progress:    progressMap[a.id] ?? 0,
  }));
}

async function unlockForCohort(assignmentId, cohortId, unlockerId, squadId = null) {
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new NotFoundError('Assignment');

  const cohort = await Cohort.findByPk(cohortId);
  if (!cohort) throw new NotFoundError('Cohort');

  const [unlock] = await AssignmentUnlock.findOrCreate({
    where:    { assignment_id: assignmentId, cohort_id: cohortId, squad_id: squadId },
    defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
  });

  if (assignment.type === 'module') {
    const linked = await CourseContentItem.findAll({ where: { linked_assignment_id: assignmentId } });
    await Promise.all(linked.map((item) =>
      CourseContentUnlock.findOrCreate({
        where:    { content_id: item.id, cohort_id: cohortId },
        defaults: { unlocked_by: unlockerId, unlocked_at: new Date() },
      })
    ));
  }

  return unlock;
}

async function lockForCohort(assignmentId, cohortId, squadId = null) {
  const assignment = await Assignment.findByPk(assignmentId);
  await AssignmentUnlock.destroy({
    where: { assignment_id: assignmentId, cohort_id: cohortId, squad_id: squadId },
  });

  if (assignment?.type === 'module') {
    const linked = await CourseContentItem.findAll({ where: { linked_assignment_id: assignmentId } });
    if (linked.length) {
      await CourseContentUnlock.destroy({
        where: { content_id: linked.map((i) => i.id), cohort_id: cohortId },
      });
    }
  }
}

async function getUnlockStatus(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId, {
    include: [{ model: AssignmentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
  });
  if (!assignment) throw new NotFoundError('Assignment');
  return assignment;
}

async function getById(id, userId = null) {
  const assignment = await Assignment.findByPk(id, {
    include: [{ model: Course, attributes: ['id', 'title', 'course_code'] }],
  });
  if (!assignment) throw new NotFoundError('Assignment');

  if (userId) {
    const enrollment = await Enrollment.findOne({
      where: { user_id: userId, course_id: assignment.course_id },
      include: [{ association: 'squad', attributes: ['id'] }],
    });
    if (enrollment?.cohort_id) {
      const squadId = enrollment.squad?.id ?? null;
      const orClauses = [{ assignment_id: id, cohort_id: enrollment.cohort_id, squad_id: null }];
      if (squadId) orClauses.push({ assignment_id: id, squad_id: squadId });
      const unlock = await AssignmentUnlock.findOne({ where: { [Op.or]: orClauses } });
      return { ...assignment.toJSON(), is_unlocked: !!unlock };
    }
    return { ...assignment.toJSON(), is_unlocked: false };
  }

  return assignment;
}

async function create(courseId, data) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');
  return Assignment.create({ ...data, course_id: courseId });
}

async function update(id, data) {
  const assignment = await Assignment.findByPk(id);
  if (!assignment) throw new NotFoundError('Assignment');
  return assignment.update(data);
}

async function remove(id) {
  const assignment = await Assignment.findByPk(id);
  if (!assignment) throw new NotFoundError('Assignment');
  await assignment.destroy();
}

module.exports = { listByCourse, listForStudent, getById, create, update, remove, unlockForCohort, lockForCohort, getUnlockStatus, invalidateStudentCache };
