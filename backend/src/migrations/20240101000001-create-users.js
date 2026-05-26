'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_users_role AS ENUM ('superadmin', 'admin', 'instructor', 'student');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.createTable('users', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      email: {
        type:      Sequelize.STRING(255),
        allowNull: false,
        unique:    true,
      },
      username: {
        type:      Sequelize.STRING(100),
        allowNull: false,
        unique:    true,
      },
      password_hash: {
        type:      Sequelize.STRING(255),
        allowNull: true,
      },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name:  { type: Sequelize.STRING(100), allowNull: false },
      role: {
        type:         Sequelize.ENUM('superadmin', 'admin', 'instructor', 'student'),
        allowNull:    false,
        defaultValue: 'student',
      },
      is_active:  { type: Sequelize.BOOLEAN, defaultValue: true },
      last_login: { type: Sequelize.DATE,    allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['role']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_users_role;');
  },
};
