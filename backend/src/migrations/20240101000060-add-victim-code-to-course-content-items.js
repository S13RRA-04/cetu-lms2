'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('course_content_items', 'victim_code', {
      type:      Sequelize.STRING(20),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('course_content_items', 'victim_code');
  },
};
