'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_enrollments_role AS ENUM ('student', 'instructor', 'ta');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE enum_enrollments_status AS ENUM ('active', 'completed', 'withdrawn');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.createTable('enrollments', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      user_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onDelete:   'CASCADE',
      },
      course_id: {
        type:       Sequelize.UUID,
        allowNull:  false,
        references: { model: 'courses', key: 'id' },
        onDelete:   'CASCADE',
      },
      role: {
        type:         Sequelize.ENUM('student', 'instructor', 'ta'),
        allowNull:    false,
        defaultValue: 'student',
      },
      status: {
        type:         Sequelize.ENUM('active', 'completed', 'withdrawn'),
        allowNull:    false,
        defaultValue: 'active',
      },
      enrolled_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('enrollments', {
      fields: ['user_id', 'course_id'],
      type:   'unique',
      name:   'enrollments_user_course_unique',
    });
    await queryInterface.addIndex('enrollments', ['user_id']);
    await queryInterface.addIndex('enrollments', ['course_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('enrollments');
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_enrollments_role;
      DROP TYPE IF EXISTS enum_enrollments_status;
    `);
  },
};
