'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('assignments', 'drop_number', {
      type:      Sequelize.SMALLINT,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('assignments', 'role_filters', {
      type:         Sequelize.ARRAY(Sequelize.TEXT),
      allowNull:    false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('assignments', 'role_filters');
    await queryInterface.removeColumn('assignments', 'drop_number');
  },
};
