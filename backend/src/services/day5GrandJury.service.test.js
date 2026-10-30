'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planSearchUnlocks } = require('./day5GrandJury.service');

const searchSets = [
  { code: 'RESIDENCE', assignment: { id: 'res' } },
  { code: 'OFFICE',    assignment: { id: 'off' } },
];

test('day 5 release: each squad gets exactly the search set for its scene', () => {
  const plan = planSearchUnlocks(
    ['sq1', 'sq2', 'sq3', 'sq4'],
    searchSets,
    { sq1: 'RESIDENCE', sq2: 'RESIDENCE', sq3: 'OFFICE', sq4: 'OFFICE' },
    [],
  );
  assert.deepEqual(plan.toUnlock, [
    { assignmentId: 'res', squadId: 'sq1' },
    { assignmentId: 'res', squadId: 'sq2' },
    { assignmentId: 'off', squadId: 'sq3' },
    { assignmentId: 'off', squadId: 'sq4' },
  ]);
  assert.deepEqual(plan.toLock, []);
});

test('day 5 release: re-releasing after a scene change moves the squad, and is a no-op otherwise', () => {
  const existing = [
    { assignment_id: 'res', squad_id: 'sq1' },
    { assignment_id: 'res', squad_id: 'sq2' },
  ];
  const moved = planSearchUnlocks(['sq1', 'sq2'], searchSets, { sq1: 'RESIDENCE', sq2: 'OFFICE' }, existing);
  assert.deepEqual(moved.toUnlock, [{ assignmentId: 'off', squadId: 'sq2' }]);
  assert.deepEqual(moved.toLock,   [{ assignmentId: 'res', squadId: 'sq2' }]);

  const same = planSearchUnlocks(['sq1', 'sq2'], searchSets, { sq1: 'RESIDENCE', sq2: 'RESIDENCE' }, existing);
  assert.deepEqual(same, { toUnlock: [], toLock: [] });
});

test('day 5 release: a squad with no scene picked gets no search set', () => {
  const plan = planSearchUnlocks(['sq1'], searchSets, { sq1: null }, [{ assignment_id: 'off', squad_id: 'sq1' }]);
  assert.deepEqual(plan.toUnlock, []);
  assert.deepEqual(plan.toLock, [{ assignmentId: 'off', squadId: 'sq1' }]);
});
