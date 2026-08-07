'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_hypotheses', {
      id:                      { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:                 { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      squad_id:                { type: Sequelize.UUID, allowNull: false, references: { model: 'squads', key: 'id' }, onDelete: 'CASCADE' },
      statement:               { type: Sequelize.TEXT, allowNull: false },
      supporting_evidence_ids:    { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      contradicting_evidence_ids: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      assumptions:             { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      alternative_hypotheses:  { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      open_questions:          { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      confidence:              { type: Sequelize.FLOAT, allowNull: true },
      status:                  { type: Sequelize.ENUM('active', 'revised', 'abandoned'), allowNull: false, defaultValue: 'active' },
      revision_of:             { type: Sequelize.UUID, allowNull: true, references: { model: 'case_hypotheses', key: 'id' }, onDelete: 'SET NULL' },
      created_by:              { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      created_at:              { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:              { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_hypotheses', ['case_id', 'squad_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_hypotheses');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_case_hypotheses_status";');
  },
};
