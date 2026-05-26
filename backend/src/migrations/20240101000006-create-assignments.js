'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('assignments', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      course_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'courses', key: 'id' },
        onDelete:   'CASCADE',
      },
      title:               { type: Sequelize.STRING(255),  allowNull: false },
      description:         { type: Sequelize.TEXT,         allowNull: true },
      max_score:           { type: Sequelize.DECIMAL(8,2), allowNull: false, defaultValue: 100 },
      due_date:            { type: Sequelize.DATE,         allowNull: true },
      lti_resource_link_id: { type: Sequelize.STRING(255), allowNull: true },
      lineitem_url:        { type: Sequelize.STRING(512),  allowNull: true },
      is_published:        { type: Sequelize.BOOLEAN,      defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('assignments', ['course_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('assignments');
  },
};
