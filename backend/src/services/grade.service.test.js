'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../config/database');
const { Assignment, User, Enrollment, Grade, Submission, Cohort } = require('../models');
const gradeService = require('./grade.service');

test('operator scoreboard ranks by the displayed total including assessments and puzzle points', async (t) => {
  const originalQuery = sequelize.query;
  const originalCohortFindOne = Cohort.findOne;
  Cohort.findOne = async () => ({ id: 'active-cohort-1' });
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
  t.after(() => { sequelize.query = originalQuery; Cohort.findOne = originalCohortFindOne; });

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
  assert.match(sql, /WHERE e\.cohort_id = :cohortId AND u\.role = 'student'/);
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
  const originalCohortFindOne = Cohort.findOne;
  Cohort.findOne = async () => ({ id: 'active-cohort-1' });
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
  t.after(() => { sequelize.query = originalQuery; Cohort.findOne = originalCohortFindOne; });

  const result = await gradeService.getSquadScoreboard('scoreboard-denominator-test-course');

  assert.match(sql, /JOIN assignment_unlocks au/);
  assert.match(sql, /au\.squad_id IS NULL OR au\.squad_id = s\.id/);
  assert.match(sql, /SELECT DISTINCT s\.id AS squad_id, au\.assignment_id/);
  assert.match(sql, /SUM\(a\.max_score\)/);
  assert.match(sql, /COUNT\(a\.id\).*AS "available"/s);
  assert.match(sql, /e\.cohort_id = :cohortId/);
  assert.match(sql, /WHERE s\.cohort_id = :cohortId/);
  // Tied squads (equal totalScore) must resolve deterministically by squad
  // number — without this, Postgres returns ties in arbitrary/unstable
  // order, so two squads with the same score could swap places on every
  // reload (a real symptom a squad reported seeing).
  assert.match(sql, /ORDER BY "totalScore" DESC, s\.number ASC/);
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

test('grading a role-scoped individual assignment grades only that student, not same-role squadmates', async (t) => {
  const originalTransaction = sequelize.transaction;
  const originalAssignmentFind = Assignment.findByPk;
  const originalUserFind = User.findByPk;
  const originalEnrollmentFindOne = Enrollment.findOne;
  const originalEnrollmentFindAll = Enrollment.findAll;
  const originalGradeFindOrCreate = Grade.findOrCreate;
  const originalSubmissionUpdate = Submission.update;

  const assignment = {
    id: 'assignment-1', course_id: 'course-1', max_score: 100,
    role_filters: ['forensic_accountant', 'crypto_forensics'], lineitem_url: null,
  };
  Assignment.findByPk = async () => assignment;
  User.findByPk = async () => ({ id: 'user-graded' });
  Enrollment.findOne = async () => ({ squad_id: 'squad-1' });
  Enrollment.findAll = async () => ([
    { user_id: 'user-graded', User: { id: 'user-graded', professional_role: 'forensic_accountant', certifications: [] } },
    // Qualifies only via certification, not professional_role — the case
    // grade.service.js used to drop before it was switched to the shared
    // matchesRoleFilters() check.
    { user_id: 'user-cert-only', User: { id: 'user-cert-only', professional_role: 'intelligence_analyst', certifications: ['crypto_forensics'] } },
    { user_id: 'user-unrelated', User: { id: 'user-unrelated', professional_role: 'task_force_officer', certifications: [] } },
  ]);
  const gradedUserIds = [];
  Grade.findOrCreate = async ({ where }) => {
    gradedUserIds.push(where.user_id);
    return [{ user_id: where.user_id, reload: async () => ({ user_id: where.user_id }) }, true];
  };
  Submission.update = async () => [0];
  sequelize.transaction = async (callback) => callback({});

  t.after(() => {
    sequelize.transaction = originalTransaction;
    Assignment.findByPk = originalAssignmentFind;
    User.findByPk = originalUserFind;
    Enrollment.findOne = originalEnrollmentFindOne;
    Enrollment.findAll = originalEnrollmentFindAll;
    Grade.findOrCreate = originalGradeFindOrCreate;
    Submission.update = originalSubmissionUpdate;
  });

  await gradeService.upsertGrade('assignment-1', 'user-graded', { score: 90 }, 'grader-1');

  assert.deepEqual(gradedUserIds, ['user-graded']);
});

test('standings are locked to the active cohort — no active cohort means no standings, not every past cohort mixed together', async (t) => {
  const originalCohortFindOne = Cohort.findOne;
  const originalQuery = sequelize.query;
  Cohort.findOne = async () => null; // e.g. between cohorts, or none activated yet
  let queried = false;
  sequelize.query = async () => { queried = true; return [[]]; };
  t.after(() => { Cohort.findOne = originalCohortFindOne; sequelize.query = originalQuery; });

  const individual = await gradeService.getScoreboard('no-active-cohort-test-course');
  const squad = await gradeService.getSquadScoreboard('no-active-cohort-test-course');

  assert.deepEqual(individual, []);
  assert.deepEqual(squad, []);
  assert.equal(queried, false, 'should never run the standings query at all when no cohort is active');
});

test('squad grading is refused for an individual assignment, so individual work can never be graded squad-wide', async (t) => {
  const original = Assignment.findByPk;
  Assignment.findByPk = async () => ({ id: 'a-ind', course_id: 'c1', grading_mode: 'individual', max_score: 80 });
  t.after(() => { Assignment.findByPk = original; });

  await assert.rejects(
    gradeService.gradeSquad('a-ind', 'squad-1', { score: 50 }, 'grader-1'),
    (e) => e.statusCode === 400,
  );
});

test('upsertGrade invalidates that student’s assignment-list cache, so a just-graded rubric shows up without waiting for the 10s TTL', async (t) => {
  const assignmentService = require('./assignment.service');
  const { DropLocationSelection, AssignmentUnlock } = require('../models');
  const original = {
    transaction: sequelize.transaction,
    asgFindByPk: Assignment.findByPk, asgFindAll: Assignment.findAll,
    userFindByPk: User.findByPk, enrollmentFindOne: Enrollment.findOne,
    unlockFindAll: AssignmentUnlock.findAll, subFindAll: Submission.findAll,
    gradeFindOrCreate: Grade.findOrCreate, gradeFindAll: Grade.findAll,
    subUpdate: Submission.update, dropLocationFindAll: DropLocationSelection.findAll,
  };

  const assignment = { id: 'a-cache-test', course_id: 'course-cache-test', max_score: 100, grading_mode: 'individual', role_filters: [], lineitem_url: null };
  let findAllCalls = 0;
  Assignment.findByPk = async () => assignment;
  Assignment.findAll = async () => { findAllCalls += 1; return [{ id: 'a-cache-test', toJSON: () => ({ id: 'a-cache-test' }), role_filters: [], victim_name: null, questions: [] }]; };
  User.findByPk = async () => ({ id: 'student-cache-test' });
  Enrollment.findOne = async () => ({ cohort_id: 'cohort-cache-test', squad: null });
  AssignmentUnlock.findAll = async () => [];
  Submission.findAll = async () => [];
  Grade.findAll = async () => [];
  Grade.findOrCreate = async ({ where }) => [{ user_id: where.user_id, reload: async () => ({ user_id: where.user_id }) }, true];
  Submission.update = async () => [0];
  DropLocationSelection.findAll = async () => [];
  sequelize.transaction = async (callback) => callback({});

  t.after(() => {
    sequelize.transaction = original.transaction;
    Assignment.findByPk = original.asgFindByPk; Assignment.findAll = original.asgFindAll;
    User.findByPk = original.userFindByPk; Enrollment.findOne = original.enrollmentFindOne;
    AssignmentUnlock.findAll = original.unlockFindAll; Submission.findAll = original.subFindAll;
    Grade.findOrCreate = original.gradeFindOrCreate; Grade.findAll = original.gradeFindAll;
    Submission.update = original.subUpdate; DropLocationSelection.findAll = original.dropLocationFindAll;
  });

  await assignmentService.listForStudent('course-cache-test', 'student-cache-test');
  assert.equal(findAllCalls, 1, 'sanity: first call queries the database');

  await assignmentService.listForStudent('course-cache-test', 'student-cache-test');
  assert.equal(findAllCalls, 1, 'sanity: second call within 10s hits the cache, not the database');

  await gradeService.upsertGrade('a-cache-test', 'student-cache-test', { score: 90 }, 'grader-1');

  await assignmentService.listForStudent('course-cache-test', 'student-cache-test');
  assert.equal(findAllCalls, 2, 'grading invalidated the cache — this call re-queried instead of returning the stale (pre-grade) list');
});

test('gradeSquad invalidates every current squad member’s cache, not just the submitter’s', async (t) => {
  const assignmentService = require('./assignment.service');
  const { DropLocationSelection, AssignmentUnlock, Squad } = require('../models');
  const original = {
    transaction: sequelize.transaction,
    asgFindByPk: Assignment.findByPk, asgFindAll: Assignment.findAll,
    squadFindByPk: Squad.findByPk, enrollmentFindAll: Enrollment.findAll, enrollmentFindOne: Enrollment.findOne,
    userFindByPk: User.findByPk, unlockFindAll: AssignmentUnlock.findAll, subFindAll: Submission.findAll,
    gradeFindOrCreate: Grade.findOrCreate, gradeFindAll: Grade.findAll,
    subUpdate: Submission.update, dropLocationFindAll: DropLocationSelection.findAll,
  };

  const assignment = { id: 'a-squad-cache-test', course_id: 'course-squad-cache-test', max_score: 100, grading_mode: 'squad', lineitem_url: null };
  const members = [{ user_id: 'member-a' }, { user_id: 'member-b' }];
  let findAllCalls = 0;
  Assignment.findByPk = async () => assignment;
  Squad.findByPk = async () => ({ id: 'squad-cache-test' });
  Enrollment.findAll = async () => members;
  Assignment.findAll = async () => { findAllCalls += 1; return [{ id: 'a-squad-cache-test', toJSON: () => ({ id: 'a-squad-cache-test' }), role_filters: [], victim_name: null, questions: [] }]; };
  User.findByPk = async () => ({ professional_role: null, certifications: [] });
  Enrollment.findOne = async () => ({ cohort_id: 'cohort-squad-cache-test', squad: null });
  AssignmentUnlock.findAll = async () => [];
  Submission.findAll = async () => [];
  Grade.findAll = async () => [];
  Grade.findOrCreate = async ({ where }) => [{ user_id: where.user_id }, true];
  Submission.update = async () => [0];
  DropLocationSelection.findAll = async () => [];
  sequelize.transaction = async (callback) => callback({});

  t.after(() => {
    sequelize.transaction = original.transaction;
    Assignment.findByPk = original.asgFindByPk; Assignment.findAll = original.asgFindAll;
    Squad.findByPk = original.squadFindByPk; Enrollment.findAll = original.enrollmentFindAll; Enrollment.findOne = original.enrollmentFindOne;
    User.findByPk = original.userFindByPk; AssignmentUnlock.findAll = original.unlockFindAll; Submission.findAll = original.subFindAll;
    Grade.findOrCreate = original.gradeFindOrCreate; Grade.findAll = original.gradeFindAll;
    Submission.update = original.subUpdate; DropLocationSelection.findAll = original.dropLocationFindAll;
  });

  // Prime both members' caches so we can prove each one gets invalidated,
  // not just whichever user happens to be "the" grade recipient.
  await assignmentService.listForStudent('course-squad-cache-test', 'member-a');
  await assignmentService.listForStudent('course-squad-cache-test', 'member-b');
  assert.equal(findAllCalls, 2, 'sanity: two distinct users, two distinct cache entries, two queries');

  // Re-fetching both again right away should still hit the cache — proves
  // the baseline (pre-grade) TTL caching itself is working before we lean on
  // "the count went up" to mean "grading invalidated it".
  await assignmentService.listForStudent('course-squad-cache-test', 'member-a');
  await assignmentService.listForStudent('course-squad-cache-test', 'member-b');
  assert.equal(findAllCalls, 2, 'sanity: still cached, no new queries yet');

  await gradeService.gradeSquad('a-squad-cache-test', 'squad-cache-test', { score: 80 }, 'grader-1');

  await assignmentService.listForStudent('course-squad-cache-test', 'member-a');
  assert.equal(findAllCalls, 3, 'member-a’s cache was invalidated by the squad grade');

  await assignmentService.listForStudent('course-squad-cache-test', 'member-b');
  assert.equal(findAllCalls, 4, 'member-b’s cache was invalidated too, not just member-a’s');
});
