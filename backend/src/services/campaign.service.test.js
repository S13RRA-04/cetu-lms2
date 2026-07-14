'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDropData } = require('./campaign.service');

test('normalizeDropData slugifies a raw scenario title so it matches assignment/content records', () => {
  assert.equal(normalizeDropData({ scenario_name: 'PACKET HEIST' }).scenario_name, 'packet-heist');
});

test('normalizeDropData is a no-op on an already-slugified scenario_name', () => {
  assert.equal(normalizeDropData({ scenario_name: 'packet-heist' }).scenario_name, 'packet-heist');
});

test('normalizeDropData leaves other fields and missing/null scenario_name untouched', () => {
  assert.deepEqual(normalizeDropData({ title: 'Drop 2', number: 2 }), { title: 'Drop 2', number: 2 });
  assert.equal(normalizeDropData({ scenario_name: null }).scenario_name, null);
});
