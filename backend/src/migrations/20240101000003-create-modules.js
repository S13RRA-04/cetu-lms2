'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('modules', {
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
      title:       { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT,        allowNull: true },
      order_index: { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 0 },
      is_published: { type: Sequelize.BOOLEAN,    defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('modules', ['course_id']);
    await queryInterface.addIndex('modules', ['course_id', 'order_index']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('modules');
  },
};
