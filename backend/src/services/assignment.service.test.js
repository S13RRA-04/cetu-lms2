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
  assert.match(sql, /a\.type != 'survey' OR \(:cohortId IS NULL AND :squadId IS NULL\)/);
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

test('sanitizeQuestionsForStudent strips the rubric entirely when ungraded, and strips only commonErrors (never keyElements) once graded', () => {
  const questions = [
    { id: 'q1', kind: 'prompt', points: 10, text: 'Explain it', rubric: { keyElements: ['a', 'b'], commonErrors: ['MODEL ANSWER: the real answer'] } },
    { id: 'q2', stem: 'Pick one', payload: { kind: 'multiple_choice' } }, // no rubric — untouched either way
  ];

  const ungraded = assignmentService.sanitizeQuestionsForStudent(questions, false);
  assert.equal(ungraded[0].rubric, undefined);
  assert.deepEqual(ungraded[1], questions[1]);

  const graded = assignmentService.sanitizeQuestionsForStudent(questions, true);
  assert.deepEqual(graded[0].rubric.keyElements, ['a', 'b']);
  assert.equal(graded[0].rubric.commonErrors, undefined);
  assert.deepEqual(graded[1], questions[1]);
});

test('sanitizeQuestionsForStudent is a no-op for a non-array (staff/no-questions callers)', () => {
  assert.equal(assignmentService.sanitizeQuestionsForStudent(undefined, true), undefined);
  assert.equal(assignmentService.sanitizeQuestionsForStudent(null, true), null);
});

test('getById never sends a student the rubric’s model-answer notes, and withholds even the scored checklist until a grade exists', async (t) => {
  const { Assignment, Enrollment, AssignmentUnlock, Grade } = require('../models');
  const original = {
    findByPk: Assignment.findByPk, enrollmentFindOne: Enrollment.findOne,
    unlockFindOne: AssignmentUnlock.findOne, gradeFindOne: Grade.findOne,
  };
  const rubric = { keyElements: ['must mention X'], commonErrors: ['MODEL ANSWER: X is actually...'] };
  const assignmentRow = {
    id: 'a1', course_id: 'course-1',
    toJSON: () => ({ id: 'a1', course_id: 'course-1', questions: [{ id: 'q1', kind: 'prompt', rubric }] }),
  };
  Assignment.findByPk = async () => assignmentRow;
  Enrollment.findOne = async () => ({ cohort_id: 'cohort-1', squad: null });
  AssignmentUnlock.findOne = async () => ({ id: 'unlock-1' });
  let gradeExists = false;
  Grade.findOne = async () => (gradeExists ? { id: 'grade-1' } : null);
  t.after(() => {
    Assignment.findByPk = original.findByPk; Enrollment.findOne = original.enrollmentFindOne;
    AssignmentUnlock.findOne = original.unlockFindOne; Grade.findOne = original.gradeFindOne;
  });

  const beforeGrade = await assignmentService.getById('a1', 'user-1');
  assert.equal(beforeGrade.questions[0].rubric, undefined);

  gradeExists = true;
  const afterGrade = await assignmentService.getById('a1', 'user-1');
  assert.deepEqual(afterGrade.questions[0].rubric.keyElements, ['must mention X']);
  assert.equal(afterGrade.questions[0].rubric.commonErrors, undefined);
});

test('listForStudent applies the same per-assignment grade gating to every item in the list', async (t) => {
  const { Assignment, Enrollment, AssignmentUnlock, Submission, Grade, User, DropLocationSelection } = require('../models');
  const original = {
    findAll: Assignment.findAll, enrollmentFindOne: Enrollment.findOne, userFindByPk: User.findByPk,
    unlockFindAll: AssignmentUnlock.findAll, subFindAll: Submission.findAll, gradeFindAll: Grade.findAll,
    dropLocationFindAll: DropLocationSelection.findAll,
  };
  const rubric = { keyElements: ['must mention X'], commonErrors: ['MODEL ANSWER: X is actually...'] };
  const rows = [
    { id: 'graded-1', toJSON: () => ({ id: 'graded-1', role_filters: [], victim_name: null, questions: [{ kind: 'prompt', rubric }] }), role_filters: [], victim_name: null, questions: [{ kind: 'prompt', rubric }] },
    { id: 'ungraded-1', toJSON: () => ({ id: 'ungraded-1', role_filters: [], victim_name: null, questions: [{ kind: 'prompt', rubric }] }), role_filters: [], victim_name: null, questions: [{ kind: 'prompt', rubric }] },
  ];
  Assignment.findAll = async () => rows;
  Enrollment.findOne = async () => ({ cohort_id: 'cohort-1', squad: null });
  User.findByPk = async () => ({ professional_role: null, certifications: [] });
  AssignmentUnlock.findAll = async () => [];
  Submission.findAll = async () => [];
  Grade.findAll = async () => [{ assignment_id: 'graded-1' }];
  DropLocationSelection.findAll = async () => [];
  t.after(() => {
    Assignment.findAll = original.findAll; Enrollment.findOne = original.enrollmentFindOne; User.findByPk = original.userFindByPk;
    AssignmentUnlock.findAll = original.unlockFindAll; Submission.findAll = original.subFindAll; Grade.findAll = original.gradeFindAll;
    DropLocationSelection.findAll = original.dropLocationFindAll;
  });

  // Unique course/user per test — listForStudent is cached 10s, keyed by course:user.
  const list = await assignmentService.listForStudent('course-rubric-gate-test', 'user-rubric-gate-test');
  const byId = Object.fromEntries(list.map((a) => [a.id, a]));
  assert.deepEqual(byId['graded-1'].questions[0].rubric.keyElements, ['must mention X']);
  assert.equal(byId['ungraded-1'].questions[0].rubric, undefined);
});
