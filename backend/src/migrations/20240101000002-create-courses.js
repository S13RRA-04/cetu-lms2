'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_courses_status AS ENUM ('draft', 'published', 'archived');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.createTable('courses', {
      id: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey:   true,
      },
      title:       { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT,        allowNull: true },
      course_code: { type: Sequelize.STRING(50),  allowNull: false, unique: true },
      instructor_id: {
        type:       Sequelize.UUID,
        allowNull:  true,
        references: { model: 'users', key: 'id' },
        onDelete:   'SET NULL',
      },
      status: {
        type:         Sequelize.ENUM('draft', 'published', 'archived'),
        allowNull:    false,
        defaultValue: 'draft',
      },
      thumbnail_url: { type: Sequelize.STRING(512), allowNull: true },
      start_date:    { type: Sequelize.DATEONLY,    allowNull: true },
      end_date:      { type: Sequelize.DATEONLY,    allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('courses', ['course_code']);
    await queryInterface.addIndex('courses', ['instructor_id']);
    await queryInterface.addIndex('courses', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('courses');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_courses_status;');
  },
};
