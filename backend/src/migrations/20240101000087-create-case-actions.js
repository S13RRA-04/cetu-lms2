'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_actions', {
      id:                { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:           { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      squad_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'squads', key: 'id' }, onDelete: 'CASCADE' },
      student_id:        { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      role:              { type: Sequelize.STRING(64), allowNull: true },
      action_type:       { type: Sequelize.STRING(100), allowNull: false },
      target_entity_id:  { type: Sequelize.UUID, allowNull: true, references: { model: 'case_entities', key: 'id' }, onDelete: 'SET NULL' },
      target_evidence_id: { type: Sequelize.UUID, allowNull: true, references: { model: 'case_evidence', key: 'id' }, onDelete: 'SET NULL' },
      justification_text: { type: Sequelize.TEXT, allowNull: true },
      extracted_intent:   { type: Sequelize.JSONB, allowNull: true },
      status:             { type: Sequelize.ENUM('pending', 'completed', 'denied'), allowNull: false, defaultValue: 'pending' },
      result:             { type: Sequelize.JSONB, allowNull: true },
      is_inject:          { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:         { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_actions', ['case_id', 'squad_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_actions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_case_actions_status";');
  },
};
