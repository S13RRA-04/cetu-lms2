'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE course_content_unlocks ADD COLUMN IF NOT EXISTS squad_id UUID DEFAULT NULL'
    );
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('course_content_unlocks', 'squad_id');
  },
};
