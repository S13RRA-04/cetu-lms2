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
      scenarioName: 'packet-heist',
      contentType: 'evidence',
      dropNumber: 1,
      victimCode: 'DOGWOOD',
      sourceFolder: null,
    },
  );
});

test('parses a shared drop file and infers briefing type', () => {
  const parsed = parseDropCaseFile('scenarios/PACKET HEIST/Drop-2/Command Post Bulletin 001.pdf');
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

test('ignores non-case-file source docs, including the .md mirrored by a PDFs/ folder', () => {
  assert.equal(parseDropCaseFile('scenarios/PACKET HEIST/Drop 2/Role-Based Correlation Tasking.md'), null);
  assert.equal(parseDropCaseFile('scenarios/PACKET HEIST/Drop 1/Dogwood Hotel & Resort/Initial Evidence.docx'), null);
  assert.equal(parseDropCaseFile('scenarios/PACKET HEIST V2/Drop 3/RolePlayer_Briefing_Sam_Smith.pptx'), null);
  assert.equal(parseDropCaseFile('scenarios/PACKET HEIST V2/Drop 1/CyberDyne/_INSTRUCTOR_Packet1-Manifest.md'), null);
});

test('accepts device-native evidence formats alongside PDF', () => {
  const csv = parseDropCaseFile('scenarios/PACKET HEIST V2/Drop 1/CyberDyne/fw_egress_report_jun2026.csv');
  assert.equal(csv.dropNumber, 1);
  assert.equal(csv.victimCode, 'CYBERDYNE');
  assert.equal(csv.fileName, 'fw_egress_report_jun2026.csv');

  const eml = parseDropCaseFile('scenarios/PACKET HEIST V2/Drop 1/Dogwood/invoice_payment_update.eml');
  assert.equal(eml.victimCode, 'DOGWOOD');

  const json = parseDropCaseFile('scenarios/PACKET HEIST V2/Drop 1/Redstone Memorial Hospital/edr_alert_export_0730.json');
  assert.equal(json.victimCode, 'REDSTONE');

  const txt = parseDropCaseFile('scenarios/PACKET HEIST V2/Drop 3/blackharbor_transaction_messages.txt');
  assert.equal(txt.dropNumber, 3);
  assert.equal(txt.victimCode, null);
});

test('unwraps a PDFs/ mirror folder so scoping matches the true folder level', () => {
  const sharedPdf = parseDropCaseFile('scenarios/PACKET HEIST/Drop 2/PDFs/Role-Based Correlation Tasking.pdf');
  assert.equal(sharedPdf.victimCode, null);
  assert.equal(sharedPdf.dropNumber, 2);
  assert.equal(sharedPdf.title, 'PACKET HEIST — Role Based Correlation Tasking');

  const victimPdf = parseDropCaseFile('scenarios/PACKET HEIST/Drop 1/Dogwood Hotel & Resort/PDFs/Initial Evidence.pdf');
  const { key: _key, ...victimPdfRest } = victimPdf;
  const { key: _key2, ...directRest } = parseDropCaseFile('scenarios/PACKET HEIST/Drop 1/Dogwood Hotel & Resort/Initial Evidence.pdf');
  assert.deepEqual(victimPdfRest, directRest);
});

test('keeps an unrecognized subfolder as its own source_folder group instead of collapsing to cohort-wide', () => {
  const parsed = parseDropCaseFile(
    'scenarios/PACKET HEIST/Drop 3/Parallel Investigative Squad Update/PDFs/CyberDyne Intruder Update.pdf',
  );
  assert.equal(parsed.victimCode, null);
  assert.equal(parsed.sourceFolder, 'Parallel Investigative Squad Update');
  assert.equal(parsed.title, 'Parallel Investigative Squad Update — CyberDyne Intruder Update');

  const cohortWide = parseDropCaseFile('scenarios/PACKET HEIST/Drop 2/PDFs/Role-Based Correlation Tasking.pdf');
  assert.equal(cohortWide.sourceFolder, null);
});

test('infers intel reports from common drop artifact names', () => {
  assert.equal(inferContentType('Cross-Victim Indicator Matrix.xlsx'), 'intel_report');
});

test('normalizes an R2 scenario folder to the application scenario key', () => {
  const parsed = parseDropCaseFile('scenarios/Brokered Exit/Drop 2/Shared Report.pdf');
  assert.equal(parsed.scenarioName, 'brokered-exit');
});
