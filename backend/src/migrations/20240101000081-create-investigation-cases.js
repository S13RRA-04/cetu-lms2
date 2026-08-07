'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('investigation_cases', {
      id:                  { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      assignment_id:       { type: Sequelize.UUID, allowNull: false, unique: true, references: { model: 'assignments', key: 'id' }, onDelete: 'CASCADE' },
      slug:                { type: Sequelize.STRING(100), allowNull: false, unique: true },
      title:               { type: Sequelize.STRING(255), allowNull: false },
      synopsis:            { type: Sequelize.TEXT, allowNull: true },
      learning_objectives: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      legal_process_rules: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      status:              { type: Sequelize.ENUM('draft', 'published'), allowNull: false, defaultValue: 'draft' },
      created_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:          { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('investigation_cases');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_investigation_cases_status";');
  },
};
