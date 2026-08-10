'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_attribution_assessments', {
      id:               { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      squad_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'squads', key: 'id' }, onDelete: 'CASCADE' },
      subject_entity_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'case_entities', key: 'id' }, onDelete: 'CASCADE' },
      dimensions:       { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      updated_by:       { type: Sequelize.UUID, allowNull: true },
      created_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:       { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_attribution_assessments', ['case_id', 'squad_id', 'subject_entity_id'], { unique: true, name: 'case_attribution_case_squad_subject_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_attribution_assessments');
  },
};
