'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../config/database');
const assignmentService = require('./assignment.service');

test('live overview includes assessments and surveys', async (t) => {
  const originalQuery = sequelize.query;
  let sql;
  let queryOptions;
  sequelize.query = async (query, options) => {
    sql = query;
    queryOptions = options;
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
  assert.match(sql, /e\.cohort_id = :cohortId/);
  assert.match(sql, /s\.squad_id = :squadId/);
  assert.match(sql, /a\.type = :type/);
  assert.deepEqual(queryOptions.replacements, {
    courseId: 'live-assessment-survey-test-course',
    cohortId: null,
    squadId: null,
    type: null,
  });
  assert.deepEqual(result.map(({ type, inProgressCount, completedCount }) => ({
    type,
    inProgressCount,
    completedCount,
  })), [
    { type: 'assessment', inProgressCount: 2, completedCount: 3 },
    { type: 'survey', inProgressCount: 1, completedCount: 4 },
  ]);
});

test('live overview passes cohort, squad, and assignment type filters to the aggregate query', async (t) => {
  const originalQuery = sequelize.query;
  let replacements;
  sequelize.query = async (_query, options) => {
    replacements = options.replacements;
    return [[]];
  };
  t.after(() => { sequelize.query = originalQuery; });

  await assignmentService.getLiveOverview('filtered-live-course', {
    cohort_id: 'cohort-2',
    squad_id: 'squad-7',
    type: 'survey',
  });

  assert.deepEqual(replacements, {
    courseId: 'filtered-live-course',
    cohortId: 'cohort-2',
    squadId: 'squad-7',
    type: 'survey',
  });
});
