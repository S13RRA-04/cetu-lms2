'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('scenario_packages', 'squad_number', {
      type:         Sequelize.INTEGER,
      allowNull:    true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('scenario_packages', 'squad_number');
  },
};
