import test from 'node:test';
import assert from 'node:assert/strict';
import { isScenarioDropContent } from './contentClassification.js';

test('classifies paired and newly synced scenario-drop files as Case File content', () => {
  assert.equal(isScenarioDropContent({ drop_number: 2 }), true);
  assert.equal(isScenarioDropContent({ drop_number: null, source_drop_number: 3 }), true);
});

test('keeps ordinary course resources in the Intel Library', () => {
  assert.equal(isScenarioDropContent({ content_type: 'slides', drop_number: null }), false);
  assert.equal(isScenarioDropContent({ content_type: 'resource' }), false);
});
