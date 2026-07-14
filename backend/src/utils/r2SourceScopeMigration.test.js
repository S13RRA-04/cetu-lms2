'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const migration = require('../migrations/20240101000067-add-r2-source-scope-to-course-content-items');

test('R2 source-scope migration is safe to retry after a partial deployment', async () => {
  const statements = [];
  await migration.up({
    sequelize: {
      query: async (sql) => statements.push(sql),
    },
  });

  assert.equal(statements.length, 1);
  assert.match(statements[0], /ADD COLUMN IF NOT EXISTS source_drop_number SMALLINT/);
  assert.match(statements[0], /ADD COLUMN IF NOT EXISTS source_victim_code VARCHAR\(20\)/);
  assert.match(statements[0], /CREATE INDEX IF NOT EXISTS course_content_items_r2_source_scope_idx/);
});
