'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('course_content_items', 'scenario_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addIndex('course_content_items', ['course_id', 'scenario_name', 'drop_number'], {
      name: 'course_content_items_course_scenario_drop_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('course_content_items', 'course_content_items_course_scenario_drop_idx');
    await queryInterface.removeColumn('course_content_items', 'scenario_name');
  },
};
