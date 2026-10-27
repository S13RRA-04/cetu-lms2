import test from 'node:test';
import assert from 'node:assert/strict';
import { workModeOf, splitByWorkMode } from './workMode.js';

test('grading_mode decides the mode, not type — an individually graded challenge is individual work', () => {
  assert.equal(workModeOf({ type: 'challenge', grading_mode: 'squad' }), 'squad');
  assert.equal(workModeOf({ type: 'challenge', grading_mode: 'individual' }), 'individual');
  assert.equal(workModeOf({ type: 'module' }), 'individual', 'missing grading_mode defaults to individual');
});

test('squad-graded work aimed at roles is role-team work; role filters on individual work change nothing', () => {
  assert.equal(workModeOf({ grading_mode: 'squad', role_filters: ['special_agent'] }), 'role');
  assert.equal(workModeOf({ grading_mode: 'squad', role_filters: [] }), 'squad');
  assert.equal(workModeOf({ grading_mode: 'individual', role_filters: ['special_agent'] }), 'individual');
});

test('splitByWorkMode orders individual, role team, squad; keeps order; drops empty groups', () => {
  const items = [
    { id: 'a', grading_mode: 'squad' },
    { id: 'b', grading_mode: 'individual' },
    { id: 'r', grading_mode: 'squad', role_filters: ['special_agent'] },
    { id: 'c', grading_mode: 'squad' },
  ];
  assert.deepEqual(splitByWorkMode(items).map((g) => [g.mode, g.items.map((i) => i.id)]), [
    ['individual', ['b']],
    ['role', ['r']],
    ['squad', ['a', 'c']],
  ]);
  assert.deepEqual(splitByWorkMode([{ id: 'm', grading_mode: 'individual' }]).map((g) => g.mode), ['individual']);
  assert.deepEqual(splitByWorkMode([]), []);
});
