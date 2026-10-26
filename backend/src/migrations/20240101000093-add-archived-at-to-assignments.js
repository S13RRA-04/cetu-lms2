'use strict';
// Soft-retire for assignments: deleting one cascades to every submission and
// grade (see models/index.js), so Command archives anything with student
// work instead. Archiving also unpublishes, which is what actually hides it
// from students — every student-facing query already filters is_published.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL'
    );
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('assignments', 'archived_at');
  },
};
