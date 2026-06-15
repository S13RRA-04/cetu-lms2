'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('scenario_packages', 'scenario_name', {
      type:         Sequelize.STRING(255),
      allowNull:    false,
      defaultValue: '',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('scenario_packages', 'scenario_name');
  },
};
