'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_evidence', {
      id:                      { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:                 { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      evidence_key:            { type: Sequelize.STRING(100), allowNull: false },
      source_type:             { type: Sequelize.STRING(100), allowNull: false },
      authoritative_facts:     { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      artifact_template:       { type: Sequelize.TEXT, allowNull: true },
      rendered_artifact:       { type: Sequelize.TEXT, allowNull: true },
      unlock_conditions:       { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      related_entity_ids:      { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      legal_authority_required: { type: Sequelize.STRING(64), allowNull: true },
      reliability:              { type: Sequelize.STRING(64), allowNull: true },
      role_relevance:            { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      created_at:               { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:               { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_evidence', ['case_id']);
    await queryInterface.addIndex('case_evidence', ['case_id', 'evidence_key'], { unique: true, name: 'case_evidence_case_key_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_evidence');
  },
};
