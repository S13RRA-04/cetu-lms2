'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('enrollments', 'cohort_id', {
      type:       Sequelize.UUID,
      allowNull:  true,
      references: { model: 'cohorts', key: 'id' },
      onDelete:   'SET NULL',
    });

    await queryInterface.addIndex('enrollments', ['cohort_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('enrollments', 'cohort_id');
  },
};
