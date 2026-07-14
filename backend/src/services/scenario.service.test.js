'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeScenarioName } = require('./scenario.service');

test('normalizeScenarioName slugifies a raw R2 folder title so it matches assignment/content records', () => {
  assert.equal(normalizeScenarioName('PACKET HEIST'), 'packet-heist');
});

test('normalizeScenarioName is a no-op on an already-slugified scenario_name', () => {
  assert.equal(normalizeScenarioName('packet-heist'), 'packet-heist');
});

test('normalizeScenarioName maps empty/missing input to null instead of an empty-string group', () => {
  assert.equal(normalizeScenarioName(''), null);
  assert.equal(normalizeScenarioName(null), null);
  assert.equal(normalizeScenarioName(undefined), null);
});
