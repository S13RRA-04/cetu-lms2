'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CaseTimeline, Enrollment, User } = require('../models');
const caseTimelineService = require('./caseTimeline.service');

function mockRow(initialState) {
  const row = {
    state: initialState,
    async update({ state }) { row.state = state; },
  };
  return row;
}

test('getTimeline returns null (no row created) for a caller with no squad', async (t) => {
  const original = { enrollmentFind: Enrollment.findOne, timelineFindOrCreate: CaseTimeline.findOrCreate };
  Enrollment.findOne = async () => null;
  let findOrCreateCalled = false;
  CaseTimeline.findOrCreate = async () => { findOrCreateCalled = true; return [mockRow({}), true]; };
  t.after(() => { Enrollment.findOne = original.enrollmentFind; CaseTimeline.findOrCreate = original.timelineFindOrCreate; });

  const result = await caseTimelineService.getTimeline('course-1', 'user-no-squad');
  assert.equal(result, null);
  assert.equal(findOrCreateCalled, false);
});

test('getTimeline creates an empty-state row on first access for an enrolled squad member', async (t) => {
  const original = { enrollmentFind: Enrollment.findOne, timelineFindOrCreate: CaseTimeline.findOrCreate };
  Enrollment.findOne = async () => ({ squad_id: 'squad-1' });
  let createDefaults = null;
  CaseTimeline.findOrCreate = async ({ defaults }) => { createDefaults = defaults; return [mockRow(defaults.state), true]; };
  t.after(() => { Enrollment.findOne = original.enrollmentFind; CaseTimeline.findOrCreate = original.timelineFindOrCreate; });

  const result = await caseTimelineService.getTimeline('course-1', 'user-1');
  assert.deepEqual(createDefaults.state, { manual: { answers: {}, field_meta: {}, typing: {} } });
  assert.deepEqual(result, { manual: { answers: {}, field_meta: {}, typing: {} } });
});

test('getTimeline prunes expired typing presence on read and persists the prune', async (t) => {
  const original = { enrollmentFind: Enrollment.findOne, timelineFindOrCreate: CaseTimeline.findOrCreate };
  Enrollment.findOne = async () => ({ squad_id: 'squad-1' });
  const staleState = { manual: { answers: { 'event:e1:title': 'x' }, field_meta: {}, typing: { 'event:e1:title': { user_id: 'u1', name: 'Alex', expires_at: 1 } } } };
  const row = mockRow(staleState);
  CaseTimeline.findOrCreate = async () => [row, false];
  t.after(() => { Enrollment.findOne = original.enrollmentFind; CaseTimeline.findOrCreate = original.timelineFindOrCreate; });

  const result = await caseTimelineService.getTimeline('course-1', 'user-1');
  assert.deepEqual(result.manual.typing, {});
  assert.deepEqual(row.state.manual.typing, {}, 'the prune must be persisted back to the row');
});

test('saveTimeline refuses a caller with no squad', async (t) => {
  const original = Enrollment.findOne;
  Enrollment.findOne = async () => null;
  t.after(() => { Enrollment.findOne = original; });

  await assert.rejects(
    caseTimelineService.saveTimeline('course-1', 'user-no-squad', { manual: { answers: { 'event:e1:title': 'x' } } }),
    (error) => error.statusCode === 403,
  );
});

test('saveTimeline merges an incoming event field into the squad-shared state and records who edited it', async (t) => {
  const original = { enrollmentFind: Enrollment.findOne, userFind: User.findByPk, timelineFindOrCreate: CaseTimeline.findOrCreate };
  Enrollment.findOne = async () => ({ squad_id: 'squad-1' });
  User.findByPk = async () => ({ id: 'user-1', first_name: 'Alex', last_name: 'One' });
  const row = mockRow({ manual: { answers: {}, field_meta: {}, typing: {} } });
  CaseTimeline.findOrCreate = async () => [row, false];
  t.after(() => {
    Enrollment.findOne = original.enrollmentFind; User.findByPk = original.userFind; CaseTimeline.findOrCreate = original.timelineFindOrCreate;
  });

  const result = await caseTimelineService.saveTimeline('course-1', 'user-1', {
    manual: { answers: { 'event:e1:title': 'Appliance discovered' }, typing: { 'event:e1:title': true } },
  });

  assert.equal(result.manual.answers['event:e1:title'], 'Appliance discovered');
  assert.equal(result.manual.field_meta['event:e1:title'].name, 'Alex One');
  assert.equal(row.state.manual.answers['event:e1:title'], 'Appliance discovered', 'must be persisted, not just returned');
});

test('two squadmates editing different event fields both land in the merged state (no clobbering)', async (t) => {
  const original = { enrollmentFind: Enrollment.findOne, userFind: User.findByPk, timelineFindOrCreate: CaseTimeline.findOrCreate };
  Enrollment.findOne = async () => ({ squad_id: 'squad-1' });
  const users = { 'user-1': { id: 'user-1', first_name: 'Alex', last_name: 'One' }, 'user-2': { id: 'user-2', first_name: 'Sam', last_name: 'Two' } };
  User.findByPk = async (id) => users[id];
  const row = mockRow({ manual: { answers: {}, field_meta: {}, typing: {} } });
  CaseTimeline.findOrCreate = async () => [row, false];
  t.after(() => {
    Enrollment.findOne = original.enrollmentFind; User.findByPk = original.userFind; CaseTimeline.findOrCreate = original.timelineFindOrCreate;
  });

  await caseTimelineService.saveTimeline('course-1', 'user-1', { manual: { answers: { 'event:e1:title': 'Appliance discovered' } } });
  const result = await caseTimelineService.saveTimeline('course-1', 'user-2', { manual: { answers: { 'event:e2:title': 'Wire sent' } } });

  assert.equal(result.manual.answers['event:e1:title'], 'Appliance discovered', "user-1's earlier field must survive user-2's save");
  assert.equal(result.manual.answers['event:e2:title'], 'Wire sent');
});

test('getTimelineForSquad (admin) returns the empty-state shape for a squad with no timeline yet, and never creates one', async (t) => {
  const original = CaseTimeline.findOne;
  let findOneCalled = false;
  CaseTimeline.findOne = async () => { findOneCalled = true; return null; };
  t.after(() => { CaseTimeline.findOne = original; });

  const result = await caseTimelineService.getTimelineForSquad('course-1', 'squad-9');
  assert.equal(findOneCalled, true);
  assert.deepEqual(result, { manual: { answers: {}, field_meta: {}, typing: {} } });
});
