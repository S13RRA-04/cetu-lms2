'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'platform', {
      type:         Sequelize.ENUM('pact', 'lair'),
      allowNull:    false,
      defaultValue: 'pact',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('courses', 'platform');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_courses_platform"');
  },
};
