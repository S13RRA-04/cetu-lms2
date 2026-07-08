'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('course_content_unlocks', ['cohort_id']);
    await queryInterface.addIndex('scenario_package_unlocks', ['cohort_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('course_content_unlocks', ['cohort_id']);
    await queryInterface.removeIndex('scenario_package_unlocks', ['cohort_id']);
  },
};
