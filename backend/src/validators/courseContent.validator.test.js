'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { syncDropCaseFilesSchema } = require('./courseContent.validator');

test('R2 case-file sync requires scenario and drop together when filtering', () => {
  const missingScenario = syncDropCaseFilesSchema.validate({ drop_number: 2 });
  assert.ok(missingScenario.error);

  const allScenarios = syncDropCaseFilesSchema.validate({});
  assert.equal(allScenarios.error, undefined);

  const valid = syncDropCaseFilesSchema.validate({ scenario_name: 'packet-heist', drop_number: 2 });
  assert.equal(valid.error, undefined);
});
