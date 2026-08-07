'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_legal_processes', {
      id:                     { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:                { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      squad_id:               { type: Sequelize.UUID, allowNull: false, references: { model: 'squads', key: 'id' }, onDelete: 'CASCADE' },
      requested_by:           { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      request_type:           { type: Sequelize.STRING(64), allowNull: false },
      target_entity_id:       { type: Sequelize.UUID, allowNull: true, references: { model: 'case_entities', key: 'id' }, onDelete: 'SET NULL' },
      status:                 { type: Sequelize.ENUM('pending', 'approved', 'denied'), allowNull: false, defaultValue: 'pending' },
      required_elements_met:  { type: Sequelize.JSONB, allowNull: true },
      transcript:             { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      unlocked_evidence_ids:  { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      decided_at:             { type: Sequelize.DATE, allowNull: true },
      created_at:             { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:             { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_legal_processes', ['case_id', 'squad_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_legal_processes');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_case_legal_processes_status";');
  },
};
