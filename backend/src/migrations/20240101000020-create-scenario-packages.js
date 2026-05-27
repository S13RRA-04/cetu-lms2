'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('scenario_packages', {
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
      title:          { type: Sequelize.STRING(255), allowNull: false },
      description:    { type: Sequelize.TEXT,        allowNull: true },
      r2_key:         { type: Sequelize.STRING(512), allowNull: false },
      file_name:      { type: Sequelize.STRING(255), allowNull: false },
      release_number: { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 1 },
      is_published:   { type: Sequelize.BOOLEAN,     defaultValue: false },
      created_at:     { type: Sequelize.DATE,        defaultValue: Sequelize.literal('NOW()') },
      updated_at:     { type: Sequelize.DATE,        defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('scenario_packages');
  },
};
