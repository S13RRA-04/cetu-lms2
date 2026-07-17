'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('squads', 'wheel_names', {
      type:         Sequelize.JSONB,
      allowNull:    false,
      defaultValue: [],
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('squads', 'wheel_names');
  },
};
