'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../config/database');
const { Cohort } = require('../models');
const assignmentService = require('./assignment.service');

function stubActiveCohort(t, cohortId) {
  const originalFindOne = Cohort.findOne;
  const calls = [];
  Cohort.findOne = async (options) => { calls.push(options); return cohortId ? { id: cohortId } : null; };
  t.after(() => { Cohort.findOne = originalFindOne; });
  return calls;
}

test('live overview includes assessments and surveys, scoped to the active cohort', async (t) => {
  const cohortCalls = stubActiveCohort(t, 'active-cohort');
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

  assert.deepEqual(cohortCalls[0].where, { course_id: 'live-assessment-survey-test-course', is_active: true });
  assert.match(sql, /a\.type IN \('module', 'challenge', 'assessment', 'survey'\)/);
  assert.match(sql, /e\.cohort_id = :cohortId/);
  assert.doesNotMatch(sql, /:cohortId IS NULL/);
  assert.match(sql, /s\.squad_id = :squadId/);
  assert.match(sql, /a\.type = :type/);
  assert.match(sql, /a\.type != 'survey' OR :squadId IS NULL/);
  assert.deepEqual(queryOptions.replacements, {
    courseId: 'live-assessment-survey-test-course',
    cohortId: 'active-cohort',
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

test('live overview ignores a requested cohort_id and always uses the active cohort', async (t) => {
  stubActiveCohort(t, 'active-cohort');
  const originalQuery = sequelize.query;
  let replacements;
  sequelize.query = async (_query, options) => {
    replacements = options.replacements;
    return [[]];
  };
  t.after(() => { sequelize.query = originalQuery; });

  await assignmentService.getLiveOverview('filtered-live-course', {
    cohort_id: 'past-cohort',
    squad_id: 'squad-7',
    type: 'survey',
  });

  assert.deepEqual(replacements, {
    courseId: 'filtered-live-course',
    cohortId: 'active-cohort',
    squadId: 'squad-7',
    type: 'survey',
  });
});

test('live overview returns nothing when no cohort is active', async (t) => {
  stubActiveCohort(t, null);
  const originalQuery = sequelize.query;
  let queried = false;
  sequelize.query = async () => { queried = true; return [[]]; };
  t.after(() => { sequelize.query = originalQuery; });

  assert.deepEqual(await assignmentService.getLiveOverview('no-active-cohort-course'), []);
  assert.equal(queried, false);
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

test('unlockForCohort leaves a draft unpublished (publishing is its own decision) but flushes cached lists so the unlock is immediate', async (t) => {
  const { Assignment, AssignmentUnlock } = require('../models');
  const original = { findByPk: Assignment.findByPk, cohortFindByPk: Cohort.findByPk, findOrCreate: AssignmentUnlock.findOrCreate };
  const updates = [];
  Assignment.findByPk = async () => ({
    id: 'a1', type: 'challenge', is_published: false,
    update: async (patch) => { updates.push(patch); },
  });
  Cohort.findByPk = async () => ({ id: 'cohort-1' });
  AssignmentUnlock.findOrCreate = async ({ where }) => [{ id: 'unlock-1', ...where }];
  t.after(() => {
    Assignment.findByPk = original.findByPk; Cohort.findByPk = original.cohortFindByPk;
    AssignmentUnlock.findOrCreate = original.findOrCreate;
  });

  // Prime the published-list cache, unlock, and confirm the next read reloads.
  let loads = 0;
  const originalFindAndCount = Assignment.findAndCountAll;
  Assignment.findAndCountAll = async () => { loads++; return { rows: [], count: 0 }; };
  t.after(() => { Assignment.findAndCountAll = originalFindAndCount; });
  await assignmentService.listByCourse('unlock-flush-course', {});
  await assignmentService.listByCourse('unlock-flush-course', {});
  assert.equal(loads, 1, 'second read is served from cache');

  const unlock = await assignmentService.unlockForCohort('a1', 'cohort-1', 'instructor-1', 'squad-1');
  assert.equal(unlock.squad_id, 'squad-1');
  assert.deepEqual(updates, [], 'unlocking never publishes');

  await assignmentService.listByCourse('unlock-flush-course', {});
  assert.equal(loads, 2, 'unlock flushed the cached list');
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

test('listForStudent shows a squad-graded assignment as complete once a TEAMMATE submits it, even though this student has no submission of their own', async (t) => {
  const { Assignment, Enrollment, AssignmentUnlock, Submission, Grade, User, DropLocationSelection } = require('../models');
  const original = {
    findAll: Assignment.findAll, enrollmentFindOne: Enrollment.findOne, userFindByPk: User.findByPk,
    unlockFindAll: AssignmentUnlock.findAll, subFindAll: Submission.findAll, gradeFindAll: Grade.findAll,
    dropLocationFindAll: DropLocationSelection.findAll,
  };
  const rows = [
    { id: 'squad-quiz-1', grading_mode: 'squad', toJSON: () => ({ id: 'squad-quiz-1', grading_mode: 'squad', role_filters: [], victim_name: null, questions: [] }), role_filters: [], victim_name: null, questions: [] },
  ];
  Assignment.findAll = async () => rows;
  Enrollment.findOne = async () => ({ cohort_id: 'cohort-1', squad: { id: 'squad-9', victim_code: null } });
  User.findByPk = async () => ({ professional_role: null, certifications: [] });
  AssignmentUnlock.findAll = async () => [];
  // This student's own row (if any) never reached 100 — only a squadmate's did.
  Submission.findAll = async ({ where }) => {
    if (where.user_id) return [{ assignment_id: 'squad-quiz-1', progress: 40, status: 'in_progress' }];
    if (where.squad_id) return [{ assignment_id: 'squad-quiz-1', progress: 100, status: 'submitted' }];
    return [];
  };
  Grade.findAll = async () => [];
  DropLocationSelection.findAll = async () => [];
  t.after(() => {
    Assignment.findAll = original.findAll; Enrollment.findOne = original.enrollmentFindOne; User.findByPk = original.userFindByPk;
    AssignmentUnlock.findAll = original.unlockFindAll; Submission.findAll = original.subFindAll; Grade.findAll = original.gradeFindAll;
    DropLocationSelection.findAll = original.dropLocationFindAll;
  });

  const list = await assignmentService.listForStudent('course-squad-progress-test', 'user-squad-progress-test');
  assert.equal(list.find((a) => a.id === 'squad-quiz-1').progress, 100);
});

test('listForStudent leaves an individually-graded assignment on the student\'s OWN progress, ignoring any squad_id on other submissions', async (t) => {
  const { Assignment, Enrollment, AssignmentUnlock, Submission, Grade, User, DropLocationSelection } = require('../models');
  const original = {
    findAll: Assignment.findAll, enrollmentFindOne: Enrollment.findOne, userFindByPk: User.findByPk,
    unlockFindAll: AssignmentUnlock.findAll, subFindAll: Submission.findAll, gradeFindAll: Grade.findAll,
    dropLocationFindAll: DropLocationSelection.findAll,
  };
  const rows = [
    { id: 'solo-quiz-1', grading_mode: 'individual', toJSON: () => ({ id: 'solo-quiz-1', grading_mode: 'individual', role_filters: [], victim_name: null, questions: [] }), role_filters: [], victim_name: null, questions: [] },
  ];
  Assignment.findAll = async () => rows;
  Enrollment.findOne = async () => ({ cohort_id: 'cohort-1', squad: { id: 'squad-9', victim_code: null } });
  User.findByPk = async () => ({ professional_role: null, certifications: [] });
  AssignmentUnlock.findAll = async () => [];
  Submission.findAll = async ({ where }) => {
    if (where.user_id) return [{ assignment_id: 'solo-quiz-1', progress: 25, status: 'in_progress' }];
    return []; // no squad-scoped query should even run for a non-squad-graded assignment
  };
  Grade.findAll = async () => [];
  DropLocationSelection.findAll = async () => [];
  t.after(() => {
    Assignment.findAll = original.findAll; Enrollment.findOne = original.enrollmentFindOne; User.findByPk = original.userFindByPk;
    AssignmentUnlock.findAll = original.unlockFindAll; Submission.findAll = original.subFindAll; Grade.findAll = original.gradeFindAll;
    DropLocationSelection.findAll = original.dropLocationFindAll;
  });

  const list = await assignmentService.listForStudent('course-solo-progress-test', 'user-solo-progress-test');
  assert.equal(list.find((a) => a.id === 'solo-quiz-1').progress, 25);
});

test('staff view lists every published assignment unlocked for the active cohort (cohort-wide or any squad), ignoring their own enrollment and role routing', async (t) => {
  const { Assignment, AssignmentUnlock, Submission, Enrollment } = require('../models');
  stubActiveCohort(t, 'active-cohort');
  const original = { assignmentFindAll: Assignment.findAll, unlockFindAll: AssignmentUnlock.findAll, submissionFindAll: Submission.findAll, enrollmentFindOne: Enrollment.findOne };
  const row = (id, extra = {}) => ({ id, ...extra, toJSON() { return { id, questions: [], ...extra }; } });
  Assignment.findAll = async () => [row('cohort-wide'), row('squad-only', { role_filters: ['forensic_accountant'] }), row('not-released')];
  let unlockWhere;
  AssignmentUnlock.findAll = async ({ where }) => { unlockWhere = where; return [{ assignment_id: 'cohort-wide' }, { assignment_id: 'squad-only' }]; };
  Submission.findAll = async () => [{ assignment_id: 'cohort-wide', progress: 40 }];
  Enrollment.findOne = async () => { throw new Error('staff view must not read the viewer\'s own enrollment'); };
  t.after(() => {
    Assignment.findAll = original.assignmentFindAll;
    AssignmentUnlock.findAll = original.unlockFindAll;
    Submission.findAll = original.submissionFindAll;
    Enrollment.findOne = original.enrollmentFindOne;
  });

  const result = await assignmentService.listForStaffView('staff-view-course', 'instructor-1');

  assert.deepEqual(unlockWhere, { cohort_id: 'active-cohort' });
  assert.deepEqual(result.map(({ id, is_unlocked, progress }) => ({ id, is_unlocked, progress })), [
    { id: 'cohort-wide', is_unlocked: true, progress: 40 },
    { id: 'squad-only', is_unlocked: true, progress: 0 },
    { id: 'not-released', is_unlocked: false, progress: 0 },
  ]);
});

test('staff view is empty when no cohort is active', async (t) => {
  const { Assignment } = require('../models');
  stubActiveCohort(t, null);
  const original = Assignment.findAll;
  Assignment.findAll = async () => { throw new Error('should not query assignments'); };
  t.after(() => { Assignment.findAll = original; });

  assert.deepEqual(await assignmentService.listForStaffView('no-active-staff-course', 'instructor-1'), []);
});

test('getById with staffView reports is_unlocked from the active cohort, not the viewer\'s enrollment', async (t) => {
  const { Assignment, AssignmentUnlock, Enrollment } = require('../models');
  stubActiveCohort(t, 'active-cohort');
  const original = { find: Assignment.findByPk, unlockFind: AssignmentUnlock.findOne, enrollmentFind: Enrollment.findOne };
  Assignment.findByPk = async () => ({ id: 'a1', course_id: 'course-1', is_published: true, toJSON() { return { id: 'a1', questions: [] }; } });
  let unlockWhere;
  AssignmentUnlock.findOne = async ({ where }) => { unlockWhere = where; return null; };
  Enrollment.findOne = async () => { throw new Error('staff view must not read the viewer\'s own enrollment'); };
  t.after(() => {
    Assignment.findByPk = original.find;
    AssignmentUnlock.findOne = original.unlockFind;
    Enrollment.findOne = original.enrollmentFind;
  });

  const result = await assignmentService.getById('a1', 'instructor-1', { staffView: true });
  assert.deepEqual(unlockWhere, { assignment_id: 'a1', cohort_id: 'active-cohort' });
  assert.equal(result.is_unlocked, false);
});

// Stubs model statics for one test and restores them afterwards.
function stubModel(t, model, overrides) {
  const originals = Object.fromEntries(Object.keys(overrides).map((k) => [k, model[k]]));
  Object.assign(model, overrides);
  t.after(() => Object.assign(model, originals));
}

function fakeRow(fields) {
  const row = { ...fields, updates: [] };
  row.update = async (patch) => { row.updates.push(patch); Object.assign(row, patch); return row; };
  row.destroy = async () => { row.destroyed = true; };
  return row;
}

test('remove refuses to delete an assignment with student work, and deletes one without', async (t) => {
  const { Assignment, Submission, Grade } = require('../models');
  let row = fakeRow({ id: 'a1', title: 'Day 1 Quiz' });
  let counts = { submissions: 3, grades: 0 };
  stubModel(t, Assignment, { findByPk: async () => row });
  stubModel(t, Submission, { count: async () => counts.submissions });
  stubModel(t, Grade, { count: async () => counts.grades });

  await assert.rejects(assignmentService.remove('a1'), (err) => err.statusCode === 409 && /archive it instead/.test(err.message));
  assert.equal(row.destroyed, undefined);

  counts = { submissions: 0, grades: 0 };
  row = fakeRow({ id: 'a1', title: 'Day 1 Quiz' });
  await assignmentService.remove('a1');
  assert.equal(row.destroyed, true);
});

test('archive unpublishes; restore clears archived_at but leaves it a draft; publishing an archived item is refused', async (t) => {
  const { Assignment } = require('../models');
  const row = fakeRow({ id: 'a1', is_published: true, archived_at: null });
  stubModel(t, Assignment, { findByPk: async () => row });

  await assignmentService.archive('a1');
  assert.equal(row.is_published, false);
  assert.ok(row.archived_at instanceof Date);

  await assert.rejects(assignmentService.update('a1', { is_published: true }), (err) => err.statusCode === 409);
  await assignmentService.update('a1', { title: 'Renamed while archived' });
  assert.equal(row.title, 'Renamed while archived');

  await assignmentService.restore('a1');
  assert.equal(row.archived_at, null);
  assert.equal(row.is_published, false, 'restore never republishes on its own');
});

test('duplicate makes an unpublished, unpaired copy with fresh question ids', async (t) => {
  const { Assignment } = require('../models');
  const source = fakeRow({
    id: 'a1', course_id: 'course-1', title: 'ATT&CK Workshop', type: 'challenge', grading_mode: 'squad',
    order_index: 29, is_published: true, drop_number: 1, scenario_name: 'packet-heist', role_filters: ['cyber_analyst'],
    questions: [{ id: 'q1', stem: 'E1', payload: { kind: 'true_false', correct: true } }],
  });
  let created;
  stubModel(t, Assignment, {
    findByPk: async () => source,
    create: async (data) => { created = data; return { id: 'copy', ...data }; },
  });

  const copy = await assignmentService.duplicate('a1');
  assert.equal(copy.title, 'ATT&CK Workshop (copy)');
  assert.equal(created.is_published, false);
  assert.equal(created.drop_number, null, 'a drop release must not publish the copy');
  assert.equal(created.scenario_name, 'packet-heist');
  assert.deepEqual(created.role_filters, ['cyber_analyst']);
  assert.equal(created.questions.length, 1);
  assert.notEqual(created.questions[0].id, 'q1');
  assert.equal(created.questions[0].stem, 'E1');
  assert.equal(source.questions[0].id, 'q1', 'the original is untouched');
});

test('reorder rewrites only the group\'s own slots, in the new order, and rejects ids from another course', async (t) => {
  const { Assignment } = require('../models');
  const rows = [{ id: 'a', order_index: 19 }, { id: 'b', order_index: 19 }, { id: 'c', order_index: 2 }];
  const writes = [];
  stubModel(t, Assignment, {
    findAll: async ({ where }) => rows.filter((r) => where.id.includes(r.id)),
    update: async (values, { where }) => { writes.push({ id: where.id, ...values }); return [1]; },
  });
  const originalTransaction = sequelize.transaction;
  sequelize.transaction = async (fn) => fn({});
  t.after(() => { sequelize.transaction = originalTransaction; });

  const result = await assignmentService.reorder('course-1', ['b', 'c', 'a']);
  assert.deepEqual(result, [{ id: 'b', order_index: 2 }, { id: 'c', order_index: 19 }, { id: 'a', order_index: 20 }]);
  assert.deepEqual(writes, result);

  await assert.rejects(assignmentService.reorder('course-1', ['a', 'zzz']), (err) => err.statusCode === 422);
});
