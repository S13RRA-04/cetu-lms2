'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('squads', 'case_name', {
      type:         Sequelize.STRING(255),
      allowNull:    true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('squads', 'case_name');
  },
};
