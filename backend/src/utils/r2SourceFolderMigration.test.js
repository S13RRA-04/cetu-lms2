'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const migration = require('../migrations/20240101000068-add-source-folder-to-course-content-items');

test('R2 source-folder migration is safe to retry after a partial deployment', async () => {
  const statements = [];
  await migration.up({
    sequelize: {
      query: async (sql) => statements.push(sql),
    },
  });

  assert.equal(statements.length, 1);
  assert.match(statements[0], /ADD COLUMN IF NOT EXISTS source_folder VARCHAR\(255\)/);
});
