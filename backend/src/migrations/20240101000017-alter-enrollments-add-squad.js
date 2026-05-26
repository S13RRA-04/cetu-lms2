'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('enrollments', 'squad_id', {
      type:       Sequelize.UUID,
      allowNull:  true,
      references: { model: 'squads', key: 'id' },
      onDelete:   'SET NULL',
    });
    await queryInterface.addIndex('enrollments', ['squad_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('enrollments', 'squad_id');
  },
};
