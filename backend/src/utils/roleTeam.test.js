'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isRoleTeam, isOnRoleTeam } = require('./roleTeam');

test('role team = squad-graded with role filters; individual or unfiltered work is not', () => {
  assert.equal(isRoleTeam({ grading_mode: 'squad', role_filters: ['special_agent'] }), true);
  assert.equal(isRoleTeam({ grading_mode: 'squad', role_filters: [] }), false);
  assert.equal(isRoleTeam({ grading_mode: 'individual', role_filters: ['special_agent'] }), false);
  assert.equal(isRoleTeam(null), false);
});

test('team membership follows the role filters, by role or certification', () => {
  const a = { grading_mode: 'squad', role_filters: ['forensic_accountant', 'crypto_forensics'] };
  assert.equal(isOnRoleTeam(a, { professional_role: 'forensic_accountant' }), true);
  assert.equal(isOnRoleTeam(a, { professional_role: 'special_agent', certifications: ['crypto_forensics'] }), true);
  assert.equal(isOnRoleTeam(a, { professional_role: 'special_agent', certifications: [] }), false);
  assert.equal(isOnRoleTeam(a, null), false);
});

test('everyone is "on the team" for work that isn\'t role-team work', () => {
  assert.equal(isOnRoleTeam({ grading_mode: 'squad', role_filters: [] }, { professional_role: 'special_agent' }), true);
  assert.equal(isOnRoleTeam({ grading_mode: 'individual', role_filters: ['x'] }, { professional_role: 'y' }), true);
});
