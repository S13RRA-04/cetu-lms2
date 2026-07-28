'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('legal_requests', {
      id:                     { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      assignment_id:          { type: Sequelize.UUID, allowNull: false, references: { model: 'assignments', key: 'id' }, onDelete: 'CASCADE' },
      user_id:                { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      request_type:           { type: Sequelize.STRING(64), allowNull: false, defaultValue: 'search_warrant' },
      status:                 { type: Sequelize.ENUM('pending', 'approved', 'denied'), allowNull: false, defaultValue: 'pending' },
      required_elements_met:  { type: Sequelize.JSONB, allowNull: true },
      transcript:             { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      unlocked_evidence_keys: { type: Sequelize.ARRAY(Sequelize.TEXT), allowNull: false, defaultValue: [] },
      decided_at:             { type: Sequelize.DATE, allowNull: true },
      created_at:             { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:             { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('legal_requests', ['assignment_id', 'user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('legal_requests');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_legal_requests_status";');
  },
};
