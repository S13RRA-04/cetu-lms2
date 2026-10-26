'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { activeMemberCount, normalizeCohortData } = require('./cohort.service');

test('normalizeCohortData slugifies a raw scenario title so it matches ScenarioPackage.scenario_name', () => {
  assert.equal(normalizeCohortData({ scenario_name: 'PACKET HEIST' }).scenario_name, 'packet-heist');
});

test('normalizeCohortData is a no-op on an already-slugified scenario_name', () => {
  assert.equal(normalizeCohortData({ scenario_name: 'packet-heist' }).scenario_name, 'packet-heist');
});

test('normalizeCohortData leaves other fields and a missing scenario_name key untouched', () => {
  assert.deepEqual(normalizeCohortData({ name: 'PACT July 26' }), { name: 'PACT July 26' });
});

test('normalizeCohortData maps an explicit null scenario_name to null, not a stray group', () => {
  assert.equal(normalizeCohortData({ scenario_name: null }).scenario_name, null);
});

test('activeMemberCount excludes completed and withdrawn learners', () => {
  assert.equal(activeMemberCount({ members: [
    { Enrollment: { status: 'active', role: 'student' } },
    { Enrollment: { status: 'active', role: 'instructor' } },
    { Enrollment: { status: 'completed', role: 'student' } },
    { Enrollment: { status: 'withdrawn', role: 'student' } },
  ] }), 1);
});

test('setActive deactivates every other cohort in the course and activates the chosen one, atomically', async (t) => {
  const { Cohort } = require('../models');
  const { sequelize } = require('../config/database');
  const cohortService = require('./cohort.service');
  const original = { findOne: Cohort.findOne, update: Cohort.update, transaction: sequelize.transaction };
  const calls = [];
  const cohort = { id: 'oct', async update(values, opts) { calls.push(['activate', values, !!opts?.transaction]); } };
  Cohort.findOne = async ({ where }) => (where.id === 'oct' && where.course_id === 'course-1' ? cohort : null);
  Cohort.update = async (values, opts) => { calls.push(['deactivate', values, opts.where, !!opts.transaction]); return [3]; };
  sequelize.transaction = async (callback) => callback({ id: 'tx' });
  t.after(() => {
    Cohort.findOne = original.findOne;
    Cohort.update = original.update;
    sequelize.transaction = original.transaction;
  });

  await cohortService.setActive('course-1', 'oct');
  assert.deepEqual(calls, [
    ['deactivate', { is_active: false }, { course_id: 'course-1' }, true],
    ['activate', { is_active: true }, true],
  ]);

  // A cohort from another course can't be activated through this course.
  await assert.rejects(cohortService.setActive('course-2', 'oct'), (error) => error.statusCode === 404);
});
