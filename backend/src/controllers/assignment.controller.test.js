'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const assignmentController = require('./assignment.controller');
const assignmentService = require('../services/assignment.service');

function mockRes() {
  const res = {};
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('listByCourse: staff browsing operator views (no manage flag) get the active-cohort view; students get their own enrollment view', async (t) => {
  const original = {
    listForStudent: assignmentService.listForStudent,
    listForStaffView: assignmentService.listForStaffView,
    listByCourse: assignmentService.listByCourse,
  };
  let calledWith = null;
  assignmentService.listForStudent = async (courseId, userId) => { calledWith = { fn: 'student', courseId, userId }; return ['scoped']; };
  assignmentService.listForStaffView = async (courseId, userId) => { calledWith = { fn: 'staff', courseId, userId }; return ['scoped']; };
  assignmentService.listByCourse = async () => { throw new Error('should not call the unfiltered listByCourse without manage=1'); };
  t.after(() => Object.assign(assignmentService, original));

  for (const [role, fn] of [['superadmin', 'staff'], ['admin', 'staff'], ['instructor', 'staff'], ['student', 'student']]) {
    calledWith = null;
    const req = { user: { id: `user-${role}`, role }, params: { id: 'course-1' }, query: {} };
    const res = mockRes();
    await assignmentController.listByCourse(req, res, (err) => { throw err; });
    assert.deepEqual(res.body, ['scoped'], role);
    assert.deepEqual(calledWith, { fn, courseId: 'course-1', userId: `user-${role}` }, role);
  }
});

test('listByCourse: manage=1 still returns the unfiltered course-wide list, but only for non-students', async (t) => {
  const original = { listForStudent: assignmentService.listForStudent, listByCourse: assignmentService.listByCourse };
  let manageCalledWith = null;
  assignmentService.listForStudent = async () => ['scoped'];
  assignmentService.listByCourse = async (courseId, query, opts) => { manageCalledWith = { courseId, opts }; return ['everything']; };
  t.after(() => { assignmentService.listForStudent = original.listForStudent; assignmentService.listByCourse = original.listByCourse; });

  const adminReq = { user: { id: 'admin-1', role: 'admin' }, params: { id: 'course-1' }, query: { manage: '1' } };
  const adminRes = mockRes();
  await assignmentController.listByCourse(adminReq, adminRes, (err) => { throw err; });
  assert.deepEqual(adminRes.body, ['everything']);
  assert.deepEqual(manageCalledWith, { courseId: 'course-1', opts: { includeUnpublished: true } });

  // A student passing manage=1 must not get the unfiltered path.
  manageCalledWith = null;
  const studentReq = { user: { id: 'student-1', role: 'student' }, params: { id: 'course-1' }, query: { manage: '1' } };
  const studentRes = mockRes();
  await assignmentController.listByCourse(studentReq, studentRes, (err) => { throw err; });
  assert.deepEqual(studentRes.body, ['scoped']);
  assert.equal(manageCalledWith, null, 'a student must never reach the unfiltered manage path');
});

test('getOne: every role gets the viewer-scoped assignment, staff scoped to the active cohort', async (t) => {
  const original = assignmentService.getById;
  let calledWith = null;
  assignmentService.getById = async (aid, userId, opts) => { calledWith = { aid, userId, opts }; return { id: aid, scoped: true }; };
  t.after(() => { assignmentService.getById = original; });

  for (const role of ['superadmin', 'admin', 'instructor', 'student']) {
    calledWith = null;
    const req = { user: { id: `user-${role}`, role }, params: { aid: 'a1' } };
    const res = mockRes();
    await assignmentController.getOne(req, res, (err) => { throw err; });
    assert.deepEqual(calledWith, { aid: 'a1', userId: `user-${role}`, opts: { staffView: role !== 'student' } }, role);
    assert.deepEqual(res.body, { id: 'a1', scoped: true }, role);
  }
});

test('getMyGrades: staff outside the active cohort have an empty Operator Record; inside it, only this course grades', async (t) => {
  const { Cohort, Enrollment } = require('../models');
  const gradeService = require('../services/grade.service');
  const original = { cohortFind: Cohort.findOne, enrollmentFind: Enrollment.findOne, getGradesForUser: gradeService.getGradesForUser };
  Cohort.findOne = async () => ({ id: 'active-cohort' });
  let inActiveCohort = false;
  Enrollment.findOne = async () => (inActiveCohort ? { id: 'enr-1' } : null);
  gradeService.getGradesForUser = async () => ([
    { id: 'g1', Assignment: { course_id: 'course-1' } },
    { id: 'g2', Assignment: { course_id: 'other-course' } },
  ]);
  t.after(() => {
    Cohort.findOne = original.cohortFind;
    Enrollment.findOne = original.enrollmentFind;
    gradeService.getGradesForUser = original.getGradesForUser;
  });

  const req = { user: { id: 'instructor-1', role: 'instructor' }, params: { id: 'course-1' } };
  const outside = mockRes();
  await assignmentController.getMyGrades(req, outside, (err) => { throw err; });
  assert.deepEqual(outside.body, []);

  inActiveCohort = true;
  const inside = mockRes();
  await assignmentController.getMyGrades(req, inside, (err) => { throw err; });
  assert.deepEqual(inside.body.map((g) => g.id), ['g1']);
});
