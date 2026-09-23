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

test('listByCourse: superadmin/admin/instructor browsing their own dashboard (no manage flag) gets the viewer-scoped list, not every assignment in the course', async (t) => {
  const original = { listForStudent: assignmentService.listForStudent, listByCourse: assignmentService.listByCourse };
  let calledWith = null;
  assignmentService.listForStudent = async (courseId, userId) => { calledWith = { courseId, userId }; return ['scoped']; };
  assignmentService.listByCourse = async () => { throw new Error('should not call the unfiltered listByCourse without manage=1'); };
  t.after(() => { assignmentService.listForStudent = original.listForStudent; assignmentService.listByCourse = original.listByCourse; });

  for (const role of ['superadmin', 'admin', 'instructor', 'student']) {
    calledWith = null;
    const req = { user: { id: `user-${role}`, role }, params: { id: 'course-1' }, query: {} };
    const res = mockRes();
    await assignmentController.listByCourse(req, res, (err) => { throw err; });
    assert.deepEqual(res.body, ['scoped'], role);
    assert.deepEqual(calledWith, { courseId: 'course-1', userId: `user-${role}` }, `${role} should be scoped to their own enrollment`);
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

test('getOne: every role gets the viewer-scoped assignment (enrollment/grade-gated), not the raw unfiltered row', async (t) => {
  const original = assignmentService.getById;
  let calledWith = null;
  assignmentService.getById = async (aid, userId) => { calledWith = { aid, userId }; return { id: aid, scoped: true }; };
  t.after(() => { assignmentService.getById = original; });

  for (const role of ['superadmin', 'admin', 'instructor', 'student']) {
    calledWith = null;
    const req = { user: { id: `user-${role}`, role }, params: { aid: 'a1' } };
    const res = mockRes();
    await assignmentController.getOne(req, res, (err) => { throw err; });
    assert.deepEqual(calledWith, { aid: 'a1', userId: `user-${role}` }, role);
    assert.deepEqual(res.body, { id: 'a1', scoped: true }, role);
  }
});
