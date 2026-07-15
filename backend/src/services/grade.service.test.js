'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../config/database');
const gradeService = require('./grade.service');

test('squad scoreboard denominator includes all assignments currently unlocked for that squad', async (t) => {
  const originalQuery = sequelize.query;
  let sql;
  sequelize.query = async (query) => {
    sql = query;
    return [[{
      squadId: 'squad-3',
      squadNumber: 3,
      squadName: null,
      totalScore: '714.00',
      maxScore: '840.00',
      graded: '7',
      available: '8',
    }]];
  };
  t.after(() => { sequelize.query = originalQuery; });

  const result = await gradeService.getSquadScoreboard('scoreboard-denominator-test-course');

  assert.match(sql, /JOIN assignment_unlocks au/);
  assert.match(sql, /au\.squad_id IS NULL OR au\.squad_id = s\.id/);
  assert.match(sql, /SELECT DISTINCT s\.id AS squad_id, au\.assignment_id/);
  assert.match(sql, /SUM\(a\.max_score\)/);
  assert.match(sql, /COUNT\(a\.id\).*AS "available"/s);
  assert.deepEqual(result, [{
    squadId: 'squad-3',
    squadNumber: 3,
    squadName: null,
    totalScore: 714,
    maxScore: 840,
    graded: 7,
    available: 8,
  }]);
});
