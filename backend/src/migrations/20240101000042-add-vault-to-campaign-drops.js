'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('campaign_drops', 'vault_hint', {
      type:      Sequelize.TEXT,
      allowNull: true,
      after:     'narrative_intro',
    });
    await queryInterface.addColumn('campaign_drops', 'vault_pin', {
      type:      Sequelize.STRING(64),
      allowNull: true,
      after:     'vault_hint',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('campaign_drops', 'vault_pin');
    await queryInterface.removeColumn('campaign_drops', 'vault_hint');
  },
};
