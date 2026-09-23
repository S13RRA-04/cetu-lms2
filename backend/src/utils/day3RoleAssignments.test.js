'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAssignmentSpecs, ROLES } = require('../../scripts/lib/day3RoleSpecs');
const { PROFESSIONAL_ROLES } = require('../config/constants');

// The worksheet's role abbreviation -> the professional role that alone may
// see and answer it.
const ROLE_CODE_TO_PROFESSIONAL_ROLE = {
  SA: 'special_agent',
  IA: 'intelligence_analyst',
  DA: 'operational_support_da',
  FoA: 'forensic_accountant',
  SOS: 'operational_support_sos',
  TFO: 'task_force_officer',
  CS: 'cyber_analyst',
};

const specs = buildAssignmentSpecs();
const roleSpecs = specs.filter((s) => s.kind === 'role');
const quizSpecs = specs.filter((s) => s.kind === 'squad_quiz');

test('Day 3 is cohort-wide: exactly 7 individual role assessments plus 1 squad synthesis quiz, none victim-scoped', () => {
  assert.equal(specs.length, ROLES.length + 1);
  assert.equal(roleSpecs.length, 7);
  assert.equal(quizSpecs.length, 1);
  for (const spec of specs) {
    assert.equal(spec.victimName, null, `${spec.title} should not be victim-scoped`);
  }
});

test('each role assignment is individually graded and scoped to exactly its own role', () => {
  for (const spec of roleSpecs) {
    assert.equal(spec.gradingMode, 'individual', spec.title);
    assert.equal(spec.roleFilters.length, 1, `${spec.title} must list exactly one role`);
    assert.ok(Object.values(PROFESSIONAL_ROLES).includes(spec.roleFilters[0]), `${spec.title}: unknown role ${spec.roleFilters[0]}`);

    const code = spec.title.match(/— (\w+) \(/)?.[1];
    assert.equal(spec.roleFilters[0], ROLE_CODE_TO_PROFESSIONAL_ROLE[code], `${spec.title}: title role does not match its role filter`);
  }
});

test('each of the 7 roles appears exactly once — no role gets two assignments or shares one', () => {
  const roles = roleSpecs.map((s) => s.roleFilters[0]).sort();
  assert.deepEqual(roles, Object.values(ROLE_CODE_TO_PROFESSIONAL_ROLE).sort());
});

test('the squad quiz is squad-graded, open to every role, and fully auto-gradable', () => {
  for (const spec of quizSpecs) {
    assert.equal(spec.gradingMode, 'squad', spec.title);
    assert.deepEqual(spec.roleFilters, [], `${spec.title} must not be role-restricted`);
    assert.equal(spec.questions.length, 5, spec.title);
    // No free-text prompt: keeps it on the auto-graded quiz path, not the
    // manually graded workshop path.
    assert.ok(spec.questions.every((q) => q.kind !== 'prompt' && q.payload?.kind === 'multiple_choice'), spec.title);
  }
});

test('role assessments include a free-response prompt so they route to the challenge flow, not the squad quiz flow', () => {
  for (const spec of roleSpecs) {
    assert.ok(spec.questions.some((q) => q.kind === 'prompt'), spec.title);
  }
});

test('titles are unique and question ids are unique within each assignment', () => {
  assert.equal(new Set(specs.map((s) => s.title)).size, specs.length);
  for (const spec of specs) {
    const ids = spec.questions.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length, spec.title);
  }
});

test('every question can actually be answered: options/blanks are present and the key is one of them', () => {
  for (const spec of specs) {
    for (const q of spec.questions) {
      if (q.kind === 'prompt') {
        assert.ok(q.text?.trim() && q.rubric?.keyElements?.length > 0, `${spec.title}: prompt needs text and rubric`);
        continue;
      }
      const p = q.payload;
      if (p.kind === 'multiple_choice') {
        assert.equal(p.options.length, 4, `${spec.title}: ${q.stem}`);
        assert.ok(p.options.every((o) => o.text?.trim()), `${spec.title}: blank option`);
        assert.equal(p.correct.length, 1);
        assert.ok(p.options.some((o) => o.id === p.correct[0]), `${spec.title}: answer key not among options`);
      } else if (p.kind === 'fill_blank') {
        assert.ok(p.blanks[0].accepted.length > 0 && p.blanks[0].accepted.every((a) => a.trim()), `${spec.title}: ${q.stem} has no accepted answer`);
      } else {
        assert.fail(`${spec.title}: unsupported question kind ${p.kind}`);
      }
    }
  }
});
