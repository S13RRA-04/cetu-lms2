'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const scenarioController = require('./scenario.controller');
const scenarioService = require('../services/scenario.service');

function mockRes() {
  const res = {};
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('list: staff (no manage flag) get the active-cohort, any-squad view; students get their own-squad view', async (t) => {
  const original = {
    listForStudent: scenarioService.listForStudent,
    listForStaffView: scenarioService.listForStaffView,
    listForAdmin: scenarioService.listForAdmin,
  };
  let calledWith = null;
  scenarioService.listForStudent = async (courseId, userId) => { calledWith = { fn: 'student', courseId, userId }; return ['scoped']; };
  scenarioService.listForStaffView = async (courseId) => { calledWith = { fn: 'staff', courseId }; return ['scoped']; };
  scenarioService.listForAdmin = async () => { throw new Error('should not call the unfiltered listForAdmin without manage=1'); };
  t.after(() => Object.assign(scenarioService, original));

  for (const [role, fn] of [['superadmin', 'staff'], ['admin', 'staff'], ['instructor', 'staff'], ['student', 'student']]) {
    calledWith = null;
    const req = { user: { id: `user-${role}`, role }, params: { id: 'course-1' }, query: {} };
    const res = mockRes();
    await scenarioController.list(req, res, (err) => { throw err; });
    assert.deepEqual(res.body, ['scoped'], role);
    const expected = fn === 'student' ? { fn, courseId: 'course-1', userId: `user-${role}` } : { fn, courseId: 'course-1' };
    assert.deepEqual(calledWith, expected, role);
  }
});

test('list: manage=1 returns the unfiltered course-wide list, but only for non-students', async (t) => {
  const original = { listForStudent: scenarioService.listForStudent, listForAdmin: scenarioService.listForAdmin };
  let manageCalledWith = null;
  scenarioService.listForStudent = async () => ['scoped'];
  scenarioService.listForAdmin = async (courseId, opts) => { manageCalledWith = { courseId, opts }; return ['everything']; };
  t.after(() => { scenarioService.listForStudent = original.listForStudent; scenarioService.listForAdmin = original.listForAdmin; });

  const adminReq = { user: { id: 'admin-1', role: 'admin' }, params: { id: 'course-1' }, query: { manage: '1' } };
  const adminRes = mockRes();
  await scenarioController.list(adminReq, adminRes, (err) => { throw err; });
  assert.deepEqual(adminRes.body, ['everything']);
  assert.deepEqual(manageCalledWith, { courseId: 'course-1', opts: { includeUnpublished: true } });

  // A student passing manage=1 must not reach the unfiltered path.
  manageCalledWith = null;
  const studentReq = { user: { id: 'student-1', role: 'student' }, params: { id: 'course-1' }, query: { manage: '1' } };
  const studentRes = mockRes();
  await scenarioController.list(studentReq, studentRes, (err) => { throw err; });
  assert.deepEqual(studentRes.body, ['scoped']);
  assert.equal(manageCalledWith, null, 'a student must never reach the unfiltered manage path');
});
