'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE course_content_items ADD COLUMN IF NOT EXISTS linked_assignment_id UUID DEFAULT NULL'
    );
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('course_content_items', 'linked_assignment_id');
  },
};
