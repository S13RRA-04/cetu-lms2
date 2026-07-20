'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('course_content_items', 'role_filters', {
      type:         Sequelize.ARRAY(Sequelize.TEXT),
      allowNull:    false,
      defaultValue: [],
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('course_content_items', 'role_filters');
  },
};
