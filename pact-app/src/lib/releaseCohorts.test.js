import test from 'node:test';
import assert from 'node:assert/strict';
import { activeLearnerCount, defaultReleaseCohortId } from './releaseCohorts.js';

test('release defaults to the first cohort with active learners, never an empty test cohort', () => {
  const cohorts = [
    { id: 'test', name: 'TEST', active_learner_count: 0 },
    { id: 'active', name: 'PACT July', active_learner_count: 37 },
    { id: 'future', name: 'PACT October', active_learner_count: 0 },
  ];
  assert.equal(defaultReleaseCohortId(cohorts), 'active');
});

test('release has no implicit target when every cohort is empty', () => {
  assert.equal(defaultReleaseCohortId([{ id: 'test', active_learner_count: 0 }]), '');
  assert.equal(activeLearnerCount({ active_learner_count: '37' }), 37);
});
