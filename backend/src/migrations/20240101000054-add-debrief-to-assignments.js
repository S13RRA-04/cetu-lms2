'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE assignments ADD COLUMN IF NOT EXISTS debrief TEXT DEFAULT NULL'
    );
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('assignments', 'debrief');
  },
};
