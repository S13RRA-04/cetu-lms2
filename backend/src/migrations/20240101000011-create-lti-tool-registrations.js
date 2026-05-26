'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('lti_tool_registrations', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      name:               { type: Sequelize.STRING(255), allowNull: false },
      client_id:          { type: Sequelize.STRING(255), allowNull: false, unique: true },
      platform_url:       { type: Sequelize.STRING(512), allowNull: false },
      auth_endpoint:      { type: Sequelize.STRING(512), allowNull: false },
      token_endpoint:     { type: Sequelize.STRING(512), allowNull: false },
      jwks_endpoint:      { type: Sequelize.STRING(512), allowNull: false },
      deployment_ids:     { type: Sequelize.JSONB,       allowNull: false, defaultValue: [] },
      is_active:          { type: Sequelize.BOOLEAN,     defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('lti_tool_registrations');
  },
};
