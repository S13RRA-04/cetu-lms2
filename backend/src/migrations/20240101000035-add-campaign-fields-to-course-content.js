'use strict';

// Add drop_number and expand content_type enum with campaign-specific types
module.exports = {
  async up(queryInterface, Sequelize) {
    // Postgres ENUM ALTER: add new values to the existing type
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_course_content_items_content_type" ADD VALUE IF NOT EXISTS 'briefing';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_course_content_items_content_type" ADD VALUE IF NOT EXISTS 'evidence';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_course_content_items_content_type" ADD VALUE IF NOT EXISTS 'intel_report';`
    );

    await queryInterface.addColumn('course_content_items', 'drop_number', {
      type:      Sequelize.SMALLINT,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('course_content_items', 'drop_number');
    // Note: Postgres does not support removing enum values; a full type recreation would be needed
  },
};
