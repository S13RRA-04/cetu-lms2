'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE submissions ADD COLUMN IF NOT EXISTS quiz_state JSONB DEFAULT NULL'
    );
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('submissions', 'quiz_state');
  },
};
