'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('campaign_drops', 'html_signal', {
      type:      Sequelize.STRING(128),
      allowNull: true,
    });
    await queryInterface.addColumn('campaign_drops', 'signal_prompt', {
      type:      Sequelize.TEXT,
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('campaign_drops', 'html_signal');
    await queryInterface.removeColumn('campaign_drops', 'signal_prompt');
  },
};
