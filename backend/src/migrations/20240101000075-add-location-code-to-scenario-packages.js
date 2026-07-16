'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('scenario_packages', 'location_code', {
      type:      Sequelize.STRING(64),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('scenario_packages', 'location_code');
  },
};
