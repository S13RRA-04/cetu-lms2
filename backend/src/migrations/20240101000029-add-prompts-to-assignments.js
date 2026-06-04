'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('assignments', 'prompts', {
      type:         Sequelize.JSONB,
      allowNull:    false,
      defaultValue: [],
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('assignments', 'prompts');
  },
};
