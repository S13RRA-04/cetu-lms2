'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const MODULE_PATH = require.resolve('./langfuse');

function loadWithEnv(overrides) {
  const names = ['LANGFUSE_PUBLIC_KEY', 'LANGFUSE_SECRET_KEY', 'LANGFUSE_BASE_URL'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) delete process.env[name];
  Object.assign(process.env, overrides);
  delete require.cache[MODULE_PATH];

  try {
    return require('./langfuse');
  } finally {
    delete require.cache[MODULE_PATH];
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

test('Langfuse remains disabled when no credentials are configured', () => {
  assert.equal(loadWithEnv({}).enabled, false);
});

test('Langfuse rejects partial credential configuration', () => {
  assert.throws(
    () => loadWithEnv({ LANGFUSE_PUBLIC_KEY: 'pk-lf-test' }),
    /PUBLIC_KEY and LANGFUSE_SECRET_KEY must be configured together/,
  );
});

test('Langfuse requires an explicit data-region base URL', () => {
  assert.throws(
    () => loadWithEnv({ LANGFUSE_PUBLIC_KEY: 'pk-lf-test', LANGFUSE_SECRET_KEY: 'sk-lf-test' }),
    /LANGFUSE_BASE_URL is required/,
  );
});

test('Langfuse export masking redacts common personal data and credentials', () => {
  const { maskTraceData } = loadWithEnv({});
  const masked = maskTraceData({
    data: 'jane@example.mil 312-555-0199 123-45-6789 Bearer abc.def AIzaABC123 sk-secret',
  });

  for (const sensitive of ['jane@example.mil', '312-555-0199', '123-45-6789', 'abc.def', 'AIzaABC123', 'sk-secret']) {
    assert.equal(masked.includes(sensitive), false);
  }
});
