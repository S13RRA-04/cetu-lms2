'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'onboarding_complete', {
      type:         Sequelize.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    });
    await queryInterface.addColumn('users', 'certifications', {
      type:         Sequelize.ARRAY(Sequelize.TEXT),
      allowNull:    false,
      defaultValue: [],
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'certifications');
    await queryInterface.removeColumn('users', 'onboarding_complete');
  },
};
