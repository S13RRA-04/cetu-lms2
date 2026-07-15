'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cohorts', 'pre_range_briefing_released_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('cohorts', 'pre_range_briefing_released_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('cohorts', 'pre_range_briefing_released_by');
    await queryInterface.removeColumn('cohorts', 'pre_range_briefing_released_at');
  },
};
