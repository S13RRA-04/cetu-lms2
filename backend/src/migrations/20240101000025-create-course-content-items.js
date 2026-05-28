'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_content_items', {
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
      title:        { type: Sequelize.STRING(255), allowNull: false },
      description:  { type: Sequelize.TEXT,        allowNull: true },
      content_type: {
        type:         Sequelize.ENUM('slides', 'handout', 'agenda', 'form', 'resource'),
        allowNull:    false,
        defaultValue: 'resource',
      },
      /* For linked content (slides, external URLs) */
      url:          { type: Sequelize.TEXT,        allowNull: true },
      /* For uploaded files (PDFs, etc.) */
      r2_key:       { type: Sequelize.STRING(512), allowNull: true },
      file_name:    { type: Sequelize.STRING(255), allowNull: true },
      file_size:    { type: Sequelize.BIGINT,      allowNull: true },
      order_index:  { type: Sequelize.INTEGER,     allowNull: false, defaultValue: 0 },
      is_published: { type: Sequelize.BOOLEAN,     defaultValue: false },
      created_at:   { type: Sequelize.DATE,        defaultValue: Sequelize.literal('NOW()') },
      updated_at:   { type: Sequelize.DATE,        defaultValue: Sequelize.literal('NOW()') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('course_content_items');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_course_content_items_content_type"');
  },
};
