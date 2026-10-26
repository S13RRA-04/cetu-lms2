import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEntries, filterEntries, countBy, countStatuses, groupEntries, groupEntriesByDay, moveWithin } from './contentWorkspace.js';

const assignments = [
  { id: 'c2', type: 'challenge', title: 'Drop 1 Quiz', order_index: 29, scenario_name: 'packet-heist' },
  { id: 'c1', type: 'challenge', title: 'Hive Workshop', order_index: 2, scenario_name: null },
  { id: 'c3', type: 'challenge', title: 'ATT&CK Mapping', order_index: 28, scenario_name: 'packet-heist' },
  { id: 'cap', type: 'capstone', title: 'Day 1 Capstone', order_index: 7 },
  { id: 'inv', type: 'investigation', title: 'Investigation Desk', order_index: 0 },
  { id: 'm1', type: 'module', title: 'Day 1 Lecture 1', order_index: 0 },
  { id: 'x', type: 'future_type', title: 'Something new', order_index: 0 },
];
const content = [
  { id: 'k2', title: 'Slides 10', content_type: 'slides' },
  { id: 'k1', title: 'Slides 2', content_type: 'slides' },
  { id: 'k3', title: 'Case file', content_type: 'evidence' },
];
const entries = buildEntries(assignments, content);

test('every assignment type and every content item becomes an entry — capstones and the investigation desk included', () => {
  assert.equal(entries.length, assignments.length + content.length);
  assert.ok(entries.some((e) => e.type === 'capstone'));
  assert.ok(entries.some((e) => e.type === 'investigation'));
  assert.ok(entries.filter((e) => e.kind === 'content').every((e) => e.type === 'library'));
  assert.equal(new Set(entries.map((e) => e.key)).size, entries.length, 'assignment and content ids cannot collide');
});

test('filters combine type, title search (case-insensitive) and status', () => {
  const statusOf = (item) => (item.id === 'c3' ? 'draft' : 'live');
  assert.deepEqual(filterEntries(entries, { type: 'challenge', statusOf }).map((e) => e.item.id), ['c2', 'c1', 'c3']);
  assert.deepEqual(filterEntries(entries, { query: 'att&ck', statusOf }).map((e) => e.item.id), ['c3']);
  assert.deepEqual(filterEntries(entries, { type: 'challenge', status: 'draft', statusOf }).map((e) => e.item.id), ['c3']);
  assert.equal(filterEntries(entries, { query: '   ', statusOf }).length, entries.length);
});

test('countBy counts per key plus an all total', () => {
  assert.deepEqual(countBy(filterEntries(entries, { type: 'library', statusOf: () => 'x' }), (e) => e.type), { all: 3, library: 3 });
});

test('sections follow the fixed type order, with unknown types last rather than dropped', () => {
  const sections = groupEntries(entries);
  assert.deepEqual(sections.map((s) => s.type), ['challenge', 'capstone', 'module', 'investigation', 'library', 'future_type']);
});

test('challenges group by scenario (no-scenario last) and sort by order_index inside a group', () => {
  const [challenges] = groupEntries(entries, { scenarioLabel: (s) => s.toUpperCase() });
  assert.deepEqual(challenges.groups.map((g) => g.label), ['PACKET-HEIST', 'No scenario']);
  assert.deepEqual(challenges.groups[0].entries.map((e) => e.item.id), ['c3', 'c2']);
  assert.equal(challenges.count, 3);
});

test('library groups by content type and sorts titles naturally', () => {
  const library = groupEntries(entries, { contentTypeLabel: (t) => `T:${t}` }).find((s) => s.type === 'library');
  assert.deepEqual(library.groups.map((g) => g.label), ['T:evidence', 'T:slides']);
  assert.deepEqual(library.groups[1].entries.map((e) => e.item.title), ['Slides 2', 'Slides 10']);
});

test('ungrouped sections render as a single unlabeled group', () => {
  const modules = groupEntries(entries).find((s) => s.type === 'module');
  assert.equal(modules.groups.length, 1);
  assert.equal(modules.groups[0].label, null);
});

test('archived items are hidden from All and only shown by the Archived filter; counts agree', () => {
  const list = buildEntries([
    { id: 'a', type: 'challenge', title: 'Old', archived_at: '2026-01-01' },
    { id: 'b', type: 'challenge', title: 'Current' },
  ]);
  const statusOf = (item) => (item.archived_at ? 'archived' : 'live');
  assert.deepEqual(filterEntries(list, { statusOf }).map((e) => e.item.id), ['b']);
  assert.deepEqual(filterEntries(list, { status: 'archived', statusOf }).map((e) => e.item.id), ['a']);
  assert.equal(filterEntries(list, { status: 'any', statusOf }).length, 2);
  assert.deepEqual(countStatuses(list, statusOf), { all: 1, archived: 1, live: 1 });
});

test('day view: days ascending, then Unscheduled, then Library; only assignment sections are reorderable', () => {
  const dayOf = (item) => ({ c1: 1, c2: 2, c3: 1, cap: 1 })[item.id] ?? null;
  const sections = groupEntriesByDay(entries, dayOf);
  assert.deepEqual(sections.map((s) => s.label), ['Day 1', 'Day 2', 'Unscheduled', 'Library']);
  assert.deepEqual(sections[0].groups[0].entries.map((e) => e.item.id), ['c1', 'cap', 'c3'], 'order_index order within a day');
  assert.deepEqual(sections.map((s) => s.reorderable), [true, true, true, false]);
  assert.equal(sections[3].count, content.length);
});

test('moveWithin swaps with the neighbour and refuses to leave the section', () => {
  assert.deepEqual(moveWithin(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b']);
  assert.deepEqual(moveWithin(['a', 'b', 'c'], 'a', 1), ['b', 'a', 'c']);
  assert.equal(moveWithin(['a', 'b'], 'a', -1), null);
  assert.equal(moveWithin(['a', 'b'], 'b', 1), null);
  assert.equal(moveWithin(['a'], 'zzz', 1), null);
});
