'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('squad_case_states', {
      id:                     { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:                { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      squad_id:               { type: Sequelize.UUID, allowNull: false, references: { model: 'squads', key: 'id' }, onDelete: 'CASCADE' },
      phase:                  { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'intake' },
      discovered_entity_ids:  { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      discovered_evidence_ids: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      active_leads:           { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      open_questions:         { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      updated_by:             { type: Sequelize.UUID, allowNull: true },
      created_at:             { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:             { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('squad_case_states', ['case_id', 'squad_id'], { unique: true, name: 'squad_case_states_case_squad_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('squad_case_states');
  },
};
