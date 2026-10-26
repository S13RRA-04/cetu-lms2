'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { reorderSlots } = require('./reorderSlots');

test('distinct values are reused as-is, sorted', () => {
  assert.deepEqual(reorderSlots([29, 2, 7]), [2, 7, 29]);
});

test('ties are spread so a reorder always takes effect', () => {
  assert.deepEqual(reorderSlots([19, 19, 19, 20]), [19, 20, 21, 22]);
});

test('never moves a slot earlier than the group\'s smallest current value', () => {
  const slots = reorderSlots([28, 29, 2]);
  assert.equal(slots[0], 2);
  for (let i = 1; i < slots.length; i++) assert.ok(slots[i] > slots[i - 1]);
});

test('empty and non-numeric input are handled', () => {
  assert.deepEqual(reorderSlots([]), []);
  assert.deepEqual(reorderSlots([null, '3']), [0, 3]);
});
