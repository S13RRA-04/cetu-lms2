'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE assignments ADD COLUMN IF NOT EXISTS scenario_name VARCHAR(255) DEFAULT NULL'
    );
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('assignments', 'scenario_name');
  },
};
