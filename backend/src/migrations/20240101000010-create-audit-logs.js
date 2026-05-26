'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
      },
      action:        { type: Sequelize.STRING(100), allowNull: false },
      resource_type: { type: Sequelize.STRING(100), allowNull: false },
      resource_id:   { type: Sequelize.UUID,        allowNull: true },
      metadata:      { type: Sequelize.JSONB,       allowNull: true },
      ip_address:    { type: Sequelize.INET,        allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('audit_logs', ['user_id']);
    await queryInterface.addIndex('audit_logs', ['resource_type', 'resource_id']);
    await queryInterface.addIndex('audit_logs', ['created_at']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
