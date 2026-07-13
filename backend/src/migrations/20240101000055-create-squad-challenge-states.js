'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('squad_challenge_states', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      assignment_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'assignments', key: 'id' }, onDelete: 'CASCADE' },
      squad_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'squads',      key: 'id' }, onDelete: 'CASCADE' },
      quiz_state:    { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      updated_by:    { type: Sequelize.UUID, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addConstraint('squad_challenge_states', {
      fields: ['assignment_id', 'squad_id'],
      type:   'unique',
      name:   'squad_challenge_states_assignment_squad_unique',
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('squad_challenge_states');
  },
};
