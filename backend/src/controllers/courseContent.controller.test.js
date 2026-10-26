'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const courseContentController = require('./courseContent.controller');
const courseContentService = require('../services/courseContent.service');

function mockRes() {
  const res = {};
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('list: staff (no manage flag) get the active-cohort, any-squad view; students get their own-squad view', async (t) => {
  const original = {
    listForStudent: courseContentService.listForStudent,
    listForStaffView: courseContentService.listForStaffView,
    listForAdmin: courseContentService.listForAdmin,
  };
  let calledWith = null;
  courseContentService.listForStudent = async (courseId, userId) => { calledWith = { fn: 'student', courseId, userId }; return ['scoped']; };
  courseContentService.listForStaffView = async (courseId) => { calledWith = { fn: 'staff', courseId }; return ['scoped']; };
  courseContentService.listForAdmin = async () => { throw new Error('should not call the unfiltered listForAdmin without manage=1'); };
  t.after(() => Object.assign(courseContentService, original));

  for (const [role, fn] of [['superadmin', 'staff'], ['admin', 'staff'], ['instructor', 'staff'], ['student', 'student']]) {
    calledWith = null;
    const req = { user: { id: `user-${role}`, role }, params: { id: 'course-1' }, query: {} };
    const res = mockRes();
    await courseContentController.list(req, res, (err) => { throw err; });
    assert.deepEqual(res.body, ['scoped'], role);
    const expected = fn === 'student' ? { fn, courseId: 'course-1', userId: `user-${role}` } : { fn, courseId: 'course-1' };
    assert.deepEqual(calledWith, expected, role);
  }
});

test('list: manage=1 returns the unfiltered course-wide list, but only for non-students', async (t) => {
  const original = { listForStudent: courseContentService.listForStudent, listForAdmin: courseContentService.listForAdmin };
  let manageCalledWith = null;
  courseContentService.listForStudent = async () => ['scoped'];
  courseContentService.listForAdmin = async (courseId, opts) => { manageCalledWith = { courseId, opts }; return ['everything']; };
  t.after(() => { courseContentService.listForStudent = original.listForStudent; courseContentService.listForAdmin = original.listForAdmin; });

  const adminReq = { user: { id: 'admin-1', role: 'admin' }, params: { id: 'course-1' }, query: { manage: '1' } };
  const adminRes = mockRes();
  await courseContentController.list(adminReq, adminRes, (err) => { throw err; });
  assert.deepEqual(adminRes.body, ['everything']);
  assert.deepEqual(manageCalledWith, { courseId: 'course-1', opts: { includeUnpublished: true } });

  // A student passing manage=1 must not reach the unfiltered path.
  manageCalledWith = null;
  const studentReq = { user: { id: 'student-1', role: 'student' }, params: { id: 'course-1' }, query: { manage: '1' } };
  const studentRes = mockRes();
  await courseContentController.list(studentReq, studentRes, (err) => { throw err; });
  assert.deepEqual(studentRes.body, ['scoped']);
  assert.equal(manageCalledWith, null, 'a student must never reach the unfiltered manage path');
});
