'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_personas', {
      id:                  { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:             { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      role_type:           { type: Sequelize.STRING(50), allowNull: false },
      name:                { type: Sequelize.STRING(255), allowNull: false },
      known_facts:         { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      unknown_facts:       { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      allowed_disclosures: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      personality:         { type: Sequelize.TEXT, allowNull: true },
      objectives:          { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      constraints:         { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      related_entity_id:   { type: Sequelize.UUID, allowNull: true, references: { model: 'case_entities', key: 'id' }, onDelete: 'SET NULL' },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_personas', ['case_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_personas');
  },
};
