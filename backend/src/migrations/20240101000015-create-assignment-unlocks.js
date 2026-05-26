'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('assignment_unlocks', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      assignment_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'assignments', key: 'id' },
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
      unlocked_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('assignment_unlocks', {
      fields: ['assignment_id', 'cohort_id'],
      type:   'unique',
      name:   'assignment_unlocks_assignment_cohort_unique',
    });
    await queryInterface.addIndex('assignment_unlocks', ['assignment_id']);
    await queryInterface.addIndex('assignment_unlocks', ['cohort_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('assignment_unlocks');
  },
};
