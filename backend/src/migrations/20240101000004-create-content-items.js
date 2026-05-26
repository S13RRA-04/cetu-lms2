'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_content_items_type AS ENUM ('video', 'document', 'quiz', 'assignment', 'lti_tool', 'text');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.createTable('content_items', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      module_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'modules', key: 'id' },
        onDelete:   'CASCADE',
      },
      title:               { type: Sequelize.STRING(255), allowNull: false },
      type: {
        type:      Sequelize.ENUM('video', 'document', 'quiz', 'assignment', 'lti_tool', 'text'),
        allowNull: false,
      },
      content_url:         { type: Sequelize.STRING(512), allowNull: true },
      lti_resource_link_id: { type: Sequelize.STRING(255), allowNull: true },
      order_index:         { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 0 },
      is_published:        { type: Sequelize.BOOLEAN,     defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('content_items', ['module_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('content_items');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_content_items_type;');
  },
};
