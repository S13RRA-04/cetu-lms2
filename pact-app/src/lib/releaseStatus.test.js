import test from 'node:test';
import assert from 'node:assert/strict';
import { activeReleaseStatus, splitActiveCohort } from './releaseStatus.js';

test('a cohort-wide unlock for the active cohort is live', () => {
  const status = activeReleaseStatus([{ cohort_id: 'oct', squad_id: null }], 'oct', 4);
  assert.equal(status.state, 'live');
  assert.equal(status.cohortWide, true);
});

test('every squad unlocked individually is live; some squads is partial', () => {
  const squads = (ids) => ids.map((id) => ({ cohort_id: 'oct', squad_id: id }));
  assert.equal(activeReleaseStatus(squads(['s1', 's2', 's3', 's4']), 'oct', 4).state, 'live');
  assert.deepEqual(activeReleaseStatus(squads(['s1', 's2']), 'oct', 4), { state: 'partial', unlockedSquads: 2, squadCount: 4 });
});

test('unlocks for other cohorts never make an item read as live', () => {
  const unlocks = [{ cohort_id: 'july', squad_id: null }, { cohort_id: 'sept', squad_id: 's9' }];
  assert.equal(activeReleaseStatus(unlocks, 'oct', 4).state, 'locked');
});

test('no active cohort is its own state, not locked', () => {
  assert.equal(activeReleaseStatus([{ cohort_id: 'oct', squad_id: null }], null, 0).state, 'no-cohort');
});

test('squad unlocks with no known squad count stay partial rather than claiming live', () => {
  assert.equal(activeReleaseStatus([{ cohort_id: 'oct', squad_id: 's1' }], 'oct', 0).state, 'partial');
});

test('splitActiveCohort pulls the active cohort out and keeps the rest in order', () => {
  const cohorts = [{ id: 'july' }, { id: 'oct', is_active: true }, { id: 'dec' }];
  const { active, others } = splitActiveCohort(cohorts);
  assert.equal(active.id, 'oct');
  assert.deepEqual(others.map((c) => c.id), ['july', 'dec']);
  assert.deepEqual(splitActiveCohort([{ id: 'july' }]).active, null);
});
