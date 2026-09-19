'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Assignment, Submission, Enrollment, AssignmentUnlock } = require('../models');
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

test('shared role-tasking submission fans out to a squadmate who only qualifies via a certification', async (t) => {
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

  const fannedOutTo = upsertCalls.map((v) => v.user_id).sort();
  assert.deepEqual(fannedOutTo, ['user-cert-only', 'user-submitter']);
});
