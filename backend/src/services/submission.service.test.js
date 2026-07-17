'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Assignment, Submission } = require('../models');
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
