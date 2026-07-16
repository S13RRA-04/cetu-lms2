'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../config/database');
const gradeService = require('./grade.service');

test('operator scoreboard ranks by the displayed total including puzzle points', async (t) => {
  const originalQuery = sequelize.query;
  let sql;
  sequelize.query = async (query) => {
    sql = query;
    return [[{
      userId: 'operator-1',
      firstName: 'Josh',
      lastName: 'Lively',
      totalScore: '390.00',
      maxScore: '403.00',
      puzzlePoints: '13.00',
      graded: '4',
    }]];
  };
  t.after(() => { sequelize.query = originalQuery; });

  const result = await gradeService.getScoreboard('operator-ranking-puzzle-points-test-course');

  assert.match(sql, /ORDER BY \(COALESCE\(SUM\(g\.score\), 0\) \+ COALESCE\(puzzle_points\.points, 0\)\) DESC/);
  assert.match(sql, /u\.last_name ASC,\s+u\.first_name ASC,\s+u\.id ASC/);
  assert.equal(result[0].totalScore, 403);
});

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
