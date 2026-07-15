'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('squad_puzzle_completions', {
      id: { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      course_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      drop_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'campaign_drops', key: 'id' }, onDelete: 'CASCADE' },
      puzzle_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'campaign_drop_puzzles', key: 'id' }, onDelete: 'CASCADE' },
      squad_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'squads', key: 'id' }, onDelete: 'CASCADE' },
      first_solver_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'RESTRICT' },
      points_awarded: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 10 },
      solved_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('squad_puzzle_completions', {
      fields: ['squad_id', 'puzzle_id'], type: 'unique', name: 'squad_puzzle_completions_squad_puzzle_unique',
    });
    await queryInterface.addIndex('squad_puzzle_completions', ['course_id', 'first_solver_id']);
  },
  async down(queryInterface) { await queryInterface.dropTable('squad_puzzle_completions'); },
};
