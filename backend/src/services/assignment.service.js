'use strict';
const { Op }             = require('sequelize');
const { Assignment, AssignmentUnlock, Course, Cohort, Enrollment, User, Submission, CourseContentItem, CourseContentUnlock } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const { paginate, paginatedResponse } = require('../utils/pagination');

async function listByCourse(courseId, query) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new NotFoundError('Course');

  const { limit, offset, page } = paginate(query);
  const { rows, count } = await Assignment.findAndCountAll({
    where:   { course_id: courseId },
    include: [{ model: AssignmentUnlock, as: 'unlocks', include: [{ model: Cohort, attributes: ['id', 'name'] }] }],
    limit, offset,
    order: [['order_index', 'ASC'], ['created_at', 'ASC']],
  });

  // Attach pending_count and graded_count to each assignment
  const assignmentIds = rows.map((r) => r.id);
  if (assignmentIds.length > 0) {
    const [pendingSubs, gradedSubs] = await Promise.all([
      Submission.findAll({ where: { assignment_id: assignmentIds, status: 'submitted'  }, attributes: ['assignment_id'] }),
      Submission.findAll({ where: { assignment_id: assignmentIds, status: 'graded'    }, attributes: ['assignment_id'] }),
    ]);
    const pendingMap = {};
    for (const s of pendingSubs) pendingMap[s.assignment_id] = (pendingMap[s.assignment_id] ?? 0) + 1;
    const gradedMap  = {};
    for (const s of gradedSubs)  gradedMap[s.assignment_id]  = (gradedMap[s.assignment_id]  ?? 0) + 1;
    rows.forEach((r) => {
      r.dataValues.pending_count = pendingMap[r.id] ?? 0;
      r.dataValues.graded_count  = gradedMap[r.id]  ?? 0;
    });
  }

  return paginatedResponse(rows, count, { page, limit });
}

async function listForStudent(courseId, userId) {
  const enrollment = await Enrollment.findOne({
    where: { user_id: userId, course_id: courseId },
    include: [{ association: 'squad', attributes: ['id'] }],
  });
  if (!enrollment) throw new AppError('Not enrolled in this course', 403, 'FORBIDDEN');

  // Unlocked if there's a cohort-wide record (squad_id IS NULL) OR a squad-specific record
  const squadId = enrollment.squad?.id ?? null;
  const orClauses = [{ cohort_id: enrollment.cohort_id, squad_id: null }];
  if (squadId) orClauses.push({ squad_id: squadId });

  const unlocks = await AssignmentUnlock.findAll({ where: { [Op.or]: orClauses } });
  const unlockedIds = new Set(unlocks.map((u) => u.assignment_id));

  const assignments = await Assignment.findAll({
    where: { course_id: courseId, is_published: true },
    order: [['order_index', 'ASC'], ['created_at', 'ASC']],
  });

  const submissions = await Submission.findAll({
    where: { assignment_id: assignments.map((a) => a.id), user_id: userId },
    attributes: ['assignment_id', 'progress', 'status'],
  });
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

module.exports = { listByCourse, listForStudent, getById, create, update, remove, unlockForCohort, lockForCohort, getUnlockStatus };
