'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_entities', {
      id:         { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      case_id:    { type: Sequelize.UUID, allowNull: false, references: { model: 'investigation_cases', key: 'id' }, onDelete: 'CASCADE' },
      type:       { type: Sequelize.STRING(50), allowNull: false },
      name:       { type: Sequelize.STRING(255), allowNull: false },
      aliases:    { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      attributes: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      notes:      { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('case_entities', ['case_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('case_entities');
  },
};
