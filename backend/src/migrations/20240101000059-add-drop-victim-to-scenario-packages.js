'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('scenario_packages', 'drop_number', {
      type:      Sequelize.SMALLINT,
      allowNull: true,
    });
    await queryInterface.addColumn('scenario_packages', 'victim_code', {
      type:      Sequelize.STRING(20),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('scenario_packages', 'victim_code');
    await queryInterface.removeColumn('scenario_packages', 'drop_number');
  },
};
