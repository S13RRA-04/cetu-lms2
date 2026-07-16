'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('./campaignPuzzle.controller');

test('preset catalog response forbids browser and intermediary caching', async () => {
  let headers;
  let body;
  let forwardedError;
  const res = {
    set(value) { headers = value; return this; },
    json(value) { body = value; return this; },
  };

  await controller.listPresets({}, res, (error) => { forwardedError = error; });

  assert.equal(forwardedError, undefined);
  assert.match(headers['Cache-Control'], /private/);
  assert.match(headers['Cache-Control'], /no-store/);
  assert.equal(headers.Pragma, 'no-cache');
  assert.equal(headers.Expires, '0');
  assert.equal(headers.Vary, 'Authorization');
  assert.ok(Array.isArray(body.data));
  assert.ok(body.data.every((preset) => preset.expectedAnswer));
});
