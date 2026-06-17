'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cohorts', 'target_revealed', {
      type:         Sequelize.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('cohorts', 'target_revealed');
  },
};
