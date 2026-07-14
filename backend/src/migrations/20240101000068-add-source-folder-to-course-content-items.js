'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE course_content_items
         ADD COLUMN IF NOT EXISTS source_folder VARCHAR(255);`,
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('course_content_items', 'source_folder');
  },
};
