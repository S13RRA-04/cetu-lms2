'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_entity_relationships', {
      id:                { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:           { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      from_entity_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'case_entities', key: 'id' }, onDelete: 'CASCADE' },
      to_entity_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'case_entities', key: 'id' }, onDelete: 'CASCADE' },
      relationship_type: { type: Sequelize.STRING(100), allowNull: false },
      attributes:        { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      evidence_ids:      { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      created_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:        { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_entity_relationships', ['case_id']);
    await queryInterface.addIndex('case_entity_relationships', ['from_entity_id']);
    await queryInterface.addIndex('case_entity_relationships', ['to_entity_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_entity_relationships');
  },
};
