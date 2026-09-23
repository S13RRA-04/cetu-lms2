'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Assignment, Submission, Enrollment, AssignmentUnlock, Grade } = require('../models');
const { Op } = require('sequelize');
const submissionService = require('./submission.service');

test('instructor submission listing refuses to identify anonymous survey respondents', async (t) => {
  const originalAssignmentFind = Assignment.findByPk;
  const originalSubmissionFind = Submission.findAll;
  let queriedSubmissions = false;
  Assignment.findByPk = async () => ({ id: 'survey-1', type: 'survey' });
  Submission.findAll = async () => {
    queriedSubmissions = true;
    return [];
  };
  t.after(() => {
    Assignment.findByPk = originalAssignmentFind;
    Submission.findAll = originalSubmissionFind;
  });

  await assert.rejects(
    submissionService.listByAssignment('survey-1'),
    (error) => error.statusCode === 403 && error.code === 'FORBIDDEN',
  );
  assert.equal(queriedSubmissions, false);
});

test('listByAssignment enriches each submission with the submitter\'s own cohort (via Enrollment, not Squad) and professional_role, for Grade Center filtering', async (t) => {
  const original = { assignmentFind: Assignment.findByPk, subFind: Submission.findAll, enrollmentFind: Enrollment.findAll };
  Assignment.findByPk = async () => ({ id: 'a1', course_id: 'course-1', type: 'challenge' });
  Submission.findAll = async () => ([
    {
      id: 'sub-1', user_id: 'user-1', status: 'submitted',
      student: { id: 'user-1', first_name: 'Ada', last_name: 'Lovelace', professional_role: 'special_agent' },
      squad:   { id: 'squad-1', number: 1, name: 'Alpha' },
      toJSON() { return { id: this.id, user_id: this.user_id, status: this.status, student: this.student, squad: this.squad }; },
    },
    {
      // No squad yet — cohort must still resolve via Enrollment, not Squad.cohort_id.
      id: 'sub-2', user_id: 'user-2', status: 'in_progress',
      student: { id: 'user-2', first_name: 'Grace', last_name: 'Hopper', professional_role: 'cyber_analyst' },
      squad:   null,
      toJSON() { return { id: this.id, user_id: this.user_id, status: this.status, student: this.student, squad: this.squad }; },
    },
  ]);
  let enrollmentQueryArgs = null;
  Enrollment.findAll = async (opts) => {
    enrollmentQueryArgs = opts;
    return [
      { user_id: 'user-1', cohort: { id: 'cohort-1', name: 'Fall 2026' } },
      { user_id: 'user-2', cohort: { id: 'cohort-1', name: 'Fall 2026' } },
    ];
  };
  t.after(() => {
    Assignment.findByPk = original.assignmentFind;
    Submission.findAll = original.subFind;
    Enrollment.findAll = original.enrollmentFind;
  });

  const result = await submissionService.listByAssignment('a1');

  assert.deepEqual(enrollmentQueryArgs.where, { course_id: 'course-1', user_id: ['user-1', 'user-2'] });
  assert.equal(result[0].cohort.name, 'Fall 2026');
  assert.equal(result[0].student.professional_role, 'special_agent');
  assert.equal(result[1].cohort.name, 'Fall 2026', 'submission with no squad still resolves cohort via Enrollment');
  assert.equal(result[1].student.professional_role, 'cyber_analyst');
});

test('listByAssignment leaves a submitter\'s cohort null (not throwing) when they have no matching Enrollment row', async (t) => {
  const original = { assignmentFind: Assignment.findByPk, subFind: Submission.findAll, enrollmentFind: Enrollment.findAll };
  Assignment.findByPk = async () => ({ id: 'a1', course_id: 'course-1', type: 'challenge' });
  Submission.findAll = async () => ([
    {
      id: 'sub-1', user_id: 'orphan-user', status: 'submitted',
      student: { id: 'orphan-user', first_name: 'No', last_name: 'Enrollment', professional_role: null },
      squad:   null,
      toJSON() { return { id: this.id, user_id: this.user_id, status: this.status, student: this.student, squad: this.squad }; },
    },
  ]);
  Enrollment.findAll = async () => [];
  t.after(() => {
    Assignment.findByPk = original.assignmentFind;
    Submission.findAll = original.subFind;
    Enrollment.findAll = original.enrollmentFind;
  });

  const result = await submissionService.listByAssignment('a1');
  assert.equal(result[0].cohort, null);
});

test('instructor progress roster refuses to identify anonymous survey respondents', async (t) => {
  const originalAssignmentFind = Assignment.findByPk;
  const originalSubmissionFind = Submission.findAll;
  let queriedSubmissions = false;
  Assignment.findByPk = async () => ({
    id: 'survey-1',
    course_id: 'course-1',
    type: 'survey',
    questions: [],
    max_score: 0,
  });
  Submission.findAll = async () => {
    queriedSubmissions = true;
    return [];
  };
  t.after(() => {
    Assignment.findByPk = originalAssignmentFind;
    Submission.findAll = originalSubmissionFind;
  });

  await assert.rejects(
    submissionService.getProgressForAssignment('survey-1'),
    (error) => error.statusCode === 403 && error.code === 'FORBIDDEN',
  );
  assert.equal(queriedSubmissions, false);
});

test('a role-scoped individual assignment is submitted only for the person submitting it, never fanned out to squadmates', async (t) => {
  const originalAssignmentFind = Assignment.findByPk;
  const originalEnrollmentFindOne = Enrollment.findOne;
  const originalEnrollmentFindAll = Enrollment.findAll;
  const originalUnlockFindOne = AssignmentUnlock.findOne;
  const originalSubmissionUpsert = Submission.upsert;

  const assignment = {
    id: 'assignment-1', course_id: 'course-1', grading_mode: 'individual',
    role_filters: ['forensic_accountant', 'crypto_forensics'], is_published: true, questions: [],
  };
  Assignment.findByPk = async () => assignment;
  Enrollment.findOne = async () => ({ course_id: 'course-1', cohort_id: 'cohort-1', squad_id: 'squad-1' });
  AssignmentUnlock.findOne = async () => null;
  Enrollment.findAll = async () => ([
    // The submitter: role_filters doesn't match by role or cert, but they
    // must have been unlocked/routed to this assignment some other way
    // (e.g. individually unlocked) — irrelevant to the fan-out check itself.
    { user_id: 'user-submitter', User: { id: 'user-submitter', professional_role: 'special_agent', certifications: [] } },
    // Qualifies only via certification, not professional_role — this is
    // exactly the case grade.service.js/submission.service.js used to drop
    // before they were switched to the shared matchesRoleFilters() check.
    { user_id: 'user-cert-only', User: { id: 'user-cert-only', professional_role: 'intelligence_analyst', certifications: ['crypto_forensics'] } },
    // Matches neither role nor cert — must NOT receive a fanned-out submission.
    { user_id: 'user-unrelated', User: { id: 'user-unrelated', professional_role: 'task_force_officer', certifications: [] } },
  ]);
  const upsertCalls = [];
  Submission.upsert = async (values) => { upsertCalls.push(values); return [{ id: `sub-${values.user_id}` }, true]; };

  t.after(() => {
    Assignment.findByPk = originalAssignmentFind;
    Enrollment.findOne = originalEnrollmentFindOne;
    Enrollment.findAll = originalEnrollmentFindAll;
    AssignmentUnlock.findOne = originalUnlockFindOne;
    Submission.upsert = originalSubmissionUpsert;
  });

  await submissionService.submit('assignment-1', 'user-submitter', '{}');

  assert.deepEqual(upsertCalls.map((v) => v.user_id), ['user-submitter']);
});

test('a squadmate opening a squad assignment sees the squad\'s submission; an individual assignment only ever shows their own', async (t) => {
  const orig = { find: Submission.findOne, asg: Assignment.findByPk, enr: Enrollment.findOne };
  const squadSubmission = { id: 'squad-sub', status: 'submitted', user_id: 'someone-else' };
  let grading = 'squad';
  Assignment.findByPk = async () => ({ id: 'a1', course_id: 'c1', grading_mode: grading });
  Enrollment.findOne = async () => ({ squad_id: 'squad-1' });
  Submission.findOne = async ({ where }) => (where.squad_id ? squadSubmission : null);
  t.after(() => { Submission.findOne = orig.find; Assignment.findByPk = orig.asg; Enrollment.findOne = orig.enr; });

  assert.equal((await submissionService.getMySubmission('a1', 'me')).id, 'squad-sub');
  grading = 'individual';
  assert.equal(await submissionService.getMySubmission('a1', 'me'), null);
});

function stubSubmitEnv(t, assignment, squadId) {
  const orig = { asg: Assignment.findByPk, enr: Enrollment.findOne, unl: AssignmentUnlock.findOne, ups: Submission.upsert };
  const upserts = [];
  Assignment.findByPk = async () => assignment;
  Enrollment.findOne = async () => ({ course_id: 'course-1', cohort_id: 'cohort-1', squad_id: squadId });
  AssignmentUnlock.findOne = async () => null;
  Submission.upsert = async (values) => { upserts.push(values); return [{ id: 'sub', update: async () => {} }, true]; };
  t.after(() => { Assignment.findByPk = orig.asg; Enrollment.findOne = orig.enr; AssignmentUnlock.findOne = orig.unl; Submission.upsert = orig.ups; });
  return upserts;
}

test('an individual role assignment is submittable without a squad and records only the submitter', async (t) => {
  const upserts = stubSubmitEnv(t, {
    id: 'a-ind', course_id: 'course-1', grading_mode: 'individual', role_filters: ['special_agent'], is_published: true, questions: [],
  }, null);
  await submissionService.submit('a-ind', 'user-1', '{}');
  assert.deepEqual(upserts.map((u) => u.user_id), ['user-1']);
});

test('a squad assignment requires a squad, then records one submission attributed to that squad', async (t) => {
  const squadAssignment = { id: 'a-squad', course_id: 'course-1', grading_mode: 'squad', role_filters: [], is_published: true, questions: [] };

  stubSubmitEnv(t, squadAssignment, null);
  await assert.rejects(submissionService.submit('a-squad', 'user-1', '{}'), (e) => e.code === 'NO_SQUAD');

  const upserts = stubSubmitEnv(t, squadAssignment, 'squad-9');
  await submissionService.submit('a-squad', 'user-1', '{}');
  assert.equal(upserts.length, 1);
  assert.equal(upserts[0].squad_id, 'squad-9');
});

test('reopenSubmission clears the grade and flips status back to in_progress for an individual assignment', async (t) => {
  const orig = { asg: Assignment.findByPk, find: Submission.findOne, destroy: Grade.destroy };
  const updates = [];
  Assignment.findByPk = async () => ({ id: 'a1', course_id: 'c1', grading_mode: 'individual' });
  Submission.findOne = async () => ({ status: 'graded', update: async (v) => updates.push(v) });
  const destroyed = [];
  Grade.destroy = async (opts) => { destroyed.push(opts); return 1; };
  t.after(() => { Assignment.findByPk = orig.asg; Submission.findOne = orig.find; Grade.destroy = orig.destroy; });

  await submissionService.reopenSubmission('a1', 'user-1');
  assert.deepEqual(destroyed[0].where, { assignment_id: 'a1', user_id: 'user-1' });
  assert.deepEqual(updates, [{ status: 'in_progress' }]);
});

test('reopenSubmission refuses a squad-graded assignment — that path is reopenSquadAttempt instead', async (t) => {
  const original = Assignment.findByPk;
  Assignment.findByPk = async () => ({ id: 'a1', course_id: 'c1', grading_mode: 'squad' });
  t.after(() => { Assignment.findByPk = original; });
  await assert.rejects(submissionService.reopenSubmission('a1', 'user-1'), (e) => e.statusCode === 400);
});

test('reopenSquadAttempt clears every current squad member\'s grade, not just the submitter\'s', async (t) => {
  const orig = { asg: Assignment.findByPk, find: Submission.findOne, enr: Enrollment.findAll, destroy: Grade.destroy };
  const updates = [];
  Assignment.findByPk = async () => ({ id: 'a-squad', course_id: 'c1', grading_mode: 'squad' });
  Submission.findOne = async () => ({ user_id: 'submitter', status: 'graded', update: async (v) => updates.push(v) });
  Enrollment.findAll = async () => ([{ user_id: 'submitter' }, { user_id: 'teammate-1' }, { user_id: 'teammate-2' }]);
  const destroyed = [];
  Grade.destroy = async (opts) => { destroyed.push(opts); return 3; };
  t.after(() => { Assignment.findByPk = orig.asg; Submission.findOne = orig.find; Enrollment.findAll = orig.enr; Grade.destroy = orig.destroy; });

  await submissionService.reopenSquadAttempt('a-squad', 'squad-1');
  assert.deepEqual(destroyed[0].where.user_id[Op.in].sort(), ['submitter', 'teammate-1', 'teammate-2']);
  assert.deepEqual(updates, [{ status: 'in_progress' }]);
});

test('reopenSquadAttempt refuses an individual assignment', async (t) => {
  const original = Assignment.findByPk;
  Assignment.findByPk = async () => ({ id: 'a1', course_id: 'c1', grading_mode: 'individual' });
  t.after(() => { Assignment.findByPk = original; });
  await assert.rejects(submissionService.reopenSquadAttempt('a1', 'squad-1'), (e) => e.statusCode === 400);
});
