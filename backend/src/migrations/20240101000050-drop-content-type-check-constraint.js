'use strict';

// Migration 35 added briefing/evidence/intel_report to the ENUM type, but
// Sequelize also created a CHECK constraint (course_content_items_content_type_check)
// with the original 5 values when the table was first built. That constraint
// still rejects the new types. Drop it — the ENUM type enforces valid values.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE course_content_items
         DROP CONSTRAINT IF EXISTS course_content_items_content_type_check`
    );

    // Re-assert the new values in case migration 35 was skipped somehow
    for (const val of ['briefing', 'evidence', 'intel_report']) {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_course_content_items_content_type" ADD VALUE IF NOT EXISTS '${val}'`
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE course_content_items
         ADD CONSTRAINT course_content_items_content_type_check
         CHECK (content_type IN ('slides','handout','agenda','form','resource','briefing','evidence','intel_report'))`
    );
  },
};
