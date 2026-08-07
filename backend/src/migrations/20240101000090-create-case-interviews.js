'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_interviews', {
      id:              { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:         { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      squad_id:        { type: Sequelize.UUID, allowNull: false, references: { model: 'squads', key: 'id' }, onDelete: 'CASCADE' },
      persona_id:      { type: Sequelize.UUID, allowNull: false, references: { model: 'case_personas', key: 'id' }, onDelete: 'CASCADE' },
      student_id:      { type: Sequelize.UUID, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      transcript:      { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      facts_disclosed: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      status:          { type: Sequelize.ENUM('in_progress', 'concluded'), allowNull: false, defaultValue: 'in_progress' },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_interviews', ['case_id', 'squad_id', 'persona_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_interviews');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_case_interviews_status";');
  },
};
