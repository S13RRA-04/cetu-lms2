'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('squads', 'victim_code', {
      type:      Sequelize.STRING(20),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('squads', 'victim_code');
  },
};
