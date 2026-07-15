'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCohortData } = require('./cohort.service');

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
