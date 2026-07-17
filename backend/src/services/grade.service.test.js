'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../config/database');
const gradeService = require('./grade.service');

test('operator scoreboard ranks by the displayed total including assessments and puzzle points', async (t) => {
  const originalQuery = sequelize.query;
  let sql;
  sequelize.query = async (query) => {
    sql = query;
    return [[{
      userId: 'operator-1',
      firstName: 'Josh',
      lastName: 'Lively',
      assignmentPoints: '350.00',
      assignmentMaxScore: '360.00',
      pretestPoints: '16.00',
      pretestMaxScore: '20.00',
      posttestPoints: '24.00',
      posttestMaxScore: '30.00',
      puzzlePoints: '13.00',
      assessmentImprovementPoints: '8.00',
      hasAssessmentComparison: true,
      performancePercent: '95.12',
      rankingEligible: true,
      maxGradedInCourse: '8',
      graded: '4',
    }]];
  };
  t.after(() => { sequelize.query = originalQuery; });

  const result = await gradeService.getScoreboard('operator-ranking-puzzle-points-test-course');

  assert.match(sql, /posttest_score \/ posttest_max \* 100/);
  assert.match(sql, /pretest_score \/ pretest_max \* 100/);
  assert.match(sql, /pretest_max > 0/);
  assert.match(sql, /posttest_max > 0/);
  assert.match(sql, /a\.lti_resource_link_id = 'assessment-pretest'/);
  assert.match(sql, /a\.lti_resource_link_id = 'assessment-posttest'/);
  assert.match(sql, /SUM\(g\.score\) FILTER/);
  assert.match(sql, /COALESCE\(assessment_scores\.pretest_score, 0\)/);
  assert.match(sql, /COALESCE\(assessment_scores\.posttest_score, 0\)/);
  assert.match(sql, /COALESCE\(puzzle_points\.points, 0\)/);
  assert.match(sql, /drop_number IS NULL OR drop_number != 7/);
  assert.match(sql, /COUNT\(g\.id\) >= CEIL\(MAX\(COUNT\(g\.id\)\) OVER \(\) \* 0\.5\)/);
  assert.match(sql, /ORDER BY "rankingEligible" DESC,\s+"performancePercent" DESC/);
  assert.match(sql, /u\.last_name ASC,\s+u\.first_name ASC,\s+u\.id ASC/);
  assert.equal(result[0].assignmentPoints, 350);
  assert.equal(result[0].pretestPoints, 16);
  assert.equal(result[0].posttestPoints, 24);
  assert.equal(result[0].puzzlePoints, 13);
  assert.equal(result[0].assessmentImprovementPoints, 8);
  assert.equal(result[0].hasAssessmentComparison, true);
  assert.equal(result[0].performancePercent, 95.12);
  assert.equal(result[0].rankingEligible, true);
  assert.equal(result[0].maxGradedInCourse, 8);
  assert.equal(result[0].totalScore, 403);
  assert.equal(result[0].maxScore, 410);
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
    assignmentPoints: 714,
    puzzlePoints: 0,
    totalScore: 714,
    maxScore: 840,
    graded: 7,
    available: 8,
  }]);
});
