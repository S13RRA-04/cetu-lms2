'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_submissions_status AS ENUM ('submitted', 'graded', 'returned');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.createTable('submissions', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      assignment_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'assignments', key: 'id' },
        onDelete:   'CASCADE',
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      content:      { type: Sequelize.TEXT,    allowNull: true },
      submitted_at: { type: Sequelize.DATE,    allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      status: {
        type:         Sequelize.ENUM('submitted', 'graded', 'returned'),
        allowNull:    false,
        defaultValue: 'submitted',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('submissions', ['assignment_id']);
    await queryInterface.addIndex('submissions', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('submissions');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_submissions_status;');
  },
};
