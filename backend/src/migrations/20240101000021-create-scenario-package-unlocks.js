'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('scenario_package_unlocks', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      package_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'scenario_packages', key: 'id' },
        onDelete:   'CASCADE',
      },
      cohort_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'cohorts', key: 'id' },
        onDelete:   'CASCADE',
      },
      unlocked_by: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
      },
      unlocked_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('scenario_package_unlocks', {
      fields: ['package_id', 'cohort_id'],
      type:   'unique',
      name:   'uq_scenario_package_unlock',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('scenario_package_unlocks');
  },
};
