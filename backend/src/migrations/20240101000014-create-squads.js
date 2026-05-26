'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('squads', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      cohort_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'cohorts', key: 'id' },
        onDelete:   'CASCADE',
      },
      number: { type: Sequelize.SMALLINT, allowNull: false },
      name:   { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('squads', ['cohort_id']);
    await queryInterface.addConstraint('squads', {
      fields: ['cohort_id', 'number'],
      type:   'unique',
      name:   'squads_cohort_number_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('squads');
  },
};
