'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../config/database');
const assignmentService = require('./assignment.service');

test('live overview includes assessments and surveys', async (t) => {
  const originalQuery = sequelize.query;
  let sql;
  sequelize.query = async (query) => {
    sql = query;
    return [[
      {
        id: 'assessment-1',
        title: 'Post Assessment',
        type: 'assessment',
        drop_number: null,
        inProgressCount: '2',
        completedCount: '3',
        lastActivityAt: '2026-07-17T12:00:00.000Z',
      },
      {
        id: 'survey-1',
        title: 'After Action Survey',
        type: 'survey',
        drop_number: null,
        inProgressCount: '1',
        completedCount: '4',
        lastActivityAt: '2026-07-17T12:01:00.000Z',
      },
    ]];
  };
  t.after(() => { sequelize.query = originalQuery; });

  const result = await assignmentService.getLiveOverview('live-assessment-survey-test-course');

  assert.match(sql, /a\.type IN \('module', 'challenge', 'assessment', 'survey'\)/);
  assert.deepEqual(result.map(({ type, inProgressCount, completedCount }) => ({
    type,
    inProgressCount,
    completedCount,
  })), [
    { type: 'assessment', inProgressCount: 2, completedCount: 3 },
    { type: 'survey', inProgressCount: 1, completedCount: 4 },
  ]);
});
