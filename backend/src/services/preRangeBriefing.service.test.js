'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PRE_RANGE_BRIEFING, isStaff } = require('./preRangeBriefing.service');
const { Cohort, Enrollment } = require('../models');

test('pre-range briefing contains the required KCR rules and 90-minute duration', () => {
  assert.equal(PRE_RANGE_BRIEFING.duration_minutes, 90);
  assert.equal(PRE_RANGE_BRIEFING.range_rules.length, 5);
  assert.match(PRE_RANGE_BRIEFING.range_rules.join(' '), /No live weapons/i);
  assert.match(PRE_RANGE_BRIEFING.range_rules.join(' '), /Return every collected evidence item/i);
});

test('pre-range briefing exposes the complete weighted rubric', () => {
  assert.equal(PRE_RANGE_BRIEFING.grading.criteria.length, 13);
  assert.equal(PRE_RANGE_BRIEFING.grading.scale.length, 4);
  assert.equal(PRE_RANGE_BRIEFING.grading.criteria.find((item) => item.name === 'Cross-venue coordination').weight, 1.5);
  assert.equal(PRE_RANGE_BRIEFING.grading.criteria.find((item) => item.name === 'Adaptive scope reasoning').weight, 1.3);
});

test('only instructor and admin roles receive staff preview access', () => {
  assert.equal(isStaff({ role: 'instructor' }), true);
  assert.equal(isStaff({ role: 'admin' }), true);
  assert.equal(isStaff({ role: 'student' }), false);
});

test('an enrolled learner cannot receive briefing content before release', async (t) => {
  const originalCohortFind = Cohort.findOne;
  const originalEnrollmentFind = Enrollment.findOne;
  t.after(() => { Cohort.findOne = originalCohortFind; Enrollment.findOne = originalEnrollmentFind; });
  Cohort.findOne = async () => ({ pre_range_briefing_released_at: null });
  Enrollment.findOne = async () => ({ id: 'enrollment-id' });
  const { get } = require('./preRangeBriefing.service');
  assert.deepEqual(await get('course-id', 'cohort-id', { id: 'student-id', role: 'student' }), { released: false, briefing: null });
});

test('a learner outside the cohort is denied access', async (t) => {
  const originalCohortFind = Cohort.findOne;
  const originalEnrollmentFind = Enrollment.findOne;
  t.after(() => { Cohort.findOne = originalCohortFind; Enrollment.findOne = originalEnrollmentFind; });
  Cohort.findOne = async () => ({ pre_range_briefing_released_at: new Date() });
  Enrollment.findOne = async () => null;
  const { get } = require('./preRangeBriefing.service');
  await assert.rejects(() => get('course-id', 'cohort-id', { id: 'student-id', role: 'student' }), (error) => error.statusCode === 403);
});
