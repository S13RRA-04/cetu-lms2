'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('grades', {
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
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      score:     { type: Sequelize.DECIMAL(8,2), allowNull: false },
      max_score: { type: Sequelize.DECIMAL(8,2), allowNull: false },
      feedback:  { type: Sequelize.TEXT,         allowNull: true },
      graded_at: { type: Sequelize.DATE,         allowNull: true },
      graded_by: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
      },
      lti_score_id: { type: Sequelize.STRING(512), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('grades', {
      fields: ['assignment_id', 'user_id'],
      type:   'unique',
      name:   'grades_assignment_user_unique',
    });
    await queryInterface.addIndex('grades', ['assignment_id']);
    await queryInterface.addIndex('grades', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('grades');
  },
};
