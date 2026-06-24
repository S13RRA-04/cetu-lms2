'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE grades ADD COLUMN IF NOT EXISTS prompt_scores JSONB DEFAULT NULL'
    );
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('grades', 'prompt_scores');
  },
};
