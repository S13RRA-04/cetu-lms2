'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cohorts', 'scenario_name', {
      type:         Sequelize.STRING(255),
      allowNull:    true,
      defaultValue: null,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('cohorts', 'scenario_name');
  },
};
