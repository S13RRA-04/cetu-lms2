'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isReuseWithinGrace } = require('./auth.service');

test('isReuseWithinGrace allows a token revoked moments ago (concurrent-tab race)', () => {
  const now = Date.now();
  assert.equal(isReuseWithinGrace(new Date(now - 2_000), 20_000, now), true);
});

test('isReuseWithinGrace allows a token revoked right at the edge of the window', () => {
  const now = Date.now();
  assert.equal(isReuseWithinGrace(new Date(now - 20_000), 20_000, now), true);
});

test('isReuseWithinGrace rejects a token revoked well outside the window (stale tab or theft)', () => {
  const now = Date.now();
  assert.equal(isReuseWithinGrace(new Date(now - 60_000), 20_000, now), false);
});

test('isReuseWithinGrace rejects a token revoked days ago', () => {
  const now = Date.now();
  assert.equal(isReuseWithinGrace(new Date(now - 7 * 24 * 60 * 60 * 1000), 20_000, now), false);
});
