'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDropCaseFile, inferContentType } = require('./r2CaseFile');

test('parses a victim-scoped drop file into case-file metadata', () => {
  assert.deepEqual(
    parseDropCaseFile('scenarios/PACKET HEIST/Drop 1/Dogwood Hotel & Resort/Initial Evidence.pdf'),
    {
      key: 'scenarios/PACKET HEIST/Drop 1/Dogwood Hotel & Resort/Initial Evidence.pdf',
      fileName: 'Initial Evidence.pdf',
      title: 'Dogwood Hotel & Resort — Initial Evidence',
      description: 'PACKET HEIST — Drop 1 — Dogwood Hotel & Resort',
      contentType: 'evidence',
      dropNumber: 1,
      victimCode: 'DOGWOOD',
    },
  );
});

test('parses a shared drop file and infers briefing type', () => {
  const parsed = parseDropCaseFile('scenarios/PACKET HEIST/Drop-2/Command Post Bulletin 001.docx');
  assert.equal(parsed.dropNumber, 2);
  assert.equal(parsed.victimCode, null);
  assert.equal(parsed.contentType, 'briefing');
  assert.equal(parsed.title, 'PACKET HEIST — Command Post Bulletin 001');
});

test('ignores objects outside a drop and folder markers', () => {
  assert.equal(parseDropCaseFile('scenarios/PACKET HEIST/readme.md'), null);
  assert.equal(parseDropCaseFile('scenarios/PACKET HEIST/Drop 1/'), null);
  assert.equal(parseDropCaseFile('other/Drop 1/file.pdf'), null);
});

test('infers intel reports from common drop artifact names', () => {
  assert.equal(inferContentType('Cross-Victim Indicator Matrix.xlsx'), 'intel_report');
});
