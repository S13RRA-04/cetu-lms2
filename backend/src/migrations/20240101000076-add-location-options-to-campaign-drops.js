'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('campaign_drops', 'location_options', {
      type:      Sequelize.JSONB,
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('campaign_drops', 'location_options');
  },
};
