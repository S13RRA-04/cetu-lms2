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
