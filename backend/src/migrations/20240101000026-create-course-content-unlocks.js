'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_content_unlocks', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      content_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'course_content_items', key: 'id' },
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_content_unlocks');
  },
};
