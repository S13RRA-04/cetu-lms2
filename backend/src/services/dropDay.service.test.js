'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DropDay } = require('../models');
const dropDayService = require('./dropDay.service');

test('set upserts a drop\'s day, normalizes a null scenario to \'\', and clears it with null', async (t) => {
  const original = { findOrCreate: DropDay.findOrCreate, destroy: DropDay.destroy };
  const calls = [];
  const row = { scenario_name: 'packet-heist-v2', drop_number: 2, course_day: 1, update: async (p) => { calls.push(['update', p]); } };
  DropDay.findOrCreate = async (opts) => { calls.push(['findOrCreate', opts.where]); return [row, false]; };
  DropDay.destroy = async (opts) => { calls.push(['destroy', opts.where]); return 1; };
  t.after(() => Object.assign(DropDay, original));

  const saved = await dropDayService.set('course-1', { scenario_name: 'packet-heist-v2', drop_number: 2, course_day: 3 });
  assert.deepEqual(saved, { scenario_name: 'packet-heist-v2', drop_number: 2, course_day: 3 });
  assert.deepEqual(calls[1], ['update', { course_day: 3 }]);

  calls.length = 0;
  assert.equal(await dropDayService.set('course-1', { scenario_name: null, drop_number: 7, course_day: null }), null);
  assert.deepEqual(calls, [['destroy', { course_id: 'course-1', scenario_name: '', drop_number: 7 }]]);
});
