'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const sharedSeed = require('../../scripts/seed-packet-heist-drop7');
const roleSeed = require('../../scripts/seed-packet-heist-drop7-role-tasking');

test('Drop 7 has one integrated squad synthesis', () => {
  assert.equal(sharedSeed.synthesisQuestions.length, 1);
  assert.equal(sharedSeed.synthesisQuestions[0].kind, 'prompt');
  assert.equal(sharedSeed.synthesisQuestions[0].points, 100);
  assert.match(sharedSeed.synthesisQuestions[0].text, /every professional role represented/i);
  assert.match(sharedSeed.synthesisQuestions[0].text, /certification-based expertise/i);
});

test('Drop 7 routes only the eight supported professional-role lanes', () => {
  assert.equal(roleSeed.PROFESSIONAL_ASSIGNMENTS.length, 8);
  assert.deepEqual(
    roleSeed.PROFESSIONAL_ASSIGNMENTS.map((assignment) => assignment.key),
    [
      'supervisory_special_agent',
      'special_agent',
      'intelligence_analyst',
      'operational_support_da',
      'operational_support_sos',
      'task_force_officer',
      'supervisory_intelligence_analyst',
      'forensic_accountant',
    ],
  );
});

test('digital evidence and cryptocurrency work route as certification tasking', () => {
  assert.deepEqual(
    roleSeed.CERTIFICATION_ASSIGNMENTS.map((assignment) => assignment.filters),
    [['DExT', 'CART', 'DFE'], ['crypto_forensics']],
  );
});

test('each Drop 7 individual assignment has an applied product and two judgment checks totaling 100 points', () => {
  const assignments = [
    ...roleSeed.PROFESSIONAL_ASSIGNMENTS,
    ...roleSeed.CERTIFICATION_ASSIGNMENTS,
  ];

  for (const assignment of assignments) {
    const questions = roleSeed.buildQuestions(assignment);
    assert.equal(questions.length, 3, assignment.key);
    assert.equal(questions[0].kind, 'prompt', assignment.key);
    assert.equal(questions[0].points, 60, assignment.key);
    assert.equal(questions[1].payload.kind, 'multiple_choice', assignment.key);
    assert.equal(questions[2].payload.kind, 'multiple_choice', assignment.key);
    assert.equal(
      questions.reduce((total, question) => total + (question.points ?? question.scoring.points), 0),
      100,
      assignment.key,
    );
  }
});
