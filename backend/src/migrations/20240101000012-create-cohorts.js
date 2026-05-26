'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cohorts', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      name: {
        type:      Sequelize.STRING(200),
        allowNull: false,
      },
      course_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'courses', key: 'id' },
        onDelete:   'CASCADE',
      },
      start_date:  { type: Sequelize.DATEONLY, allowNull: true },
      end_date:    { type: Sequelize.DATEONLY, allowNull: true },
      is_active:   { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('cohorts', ['course_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cohorts');
  },
};
