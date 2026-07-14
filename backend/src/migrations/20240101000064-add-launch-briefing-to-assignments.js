'use strict';

const DROP_2_BRIEFING = [
  'The Command Post has received preliminary reports from Task Force Squads indicating an uptick in cyber incidents perpetrated against Huntsville-area businesses over the past several months. Analysis of these reports indicates that commonalities may exist among the victims.',
  'New task force guidance directs each squad to conduct further investigation to determine whether these incidents are related or should be investigated independently. Command Post analysts have compiled new analytical data to aid task force participants, and those materials are being distributed to each squad.',
  'AUSA concurrence has been obtained to proceed with predicated investigations on the basis that these incidents may represent a greater threat to the area of responsibility.',
].join('\n\n');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('assignments', 'launch_briefing', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.sequelize.query(
      `UPDATE assignments
          SET launch_briefing = :briefing,
              updated_at = NOW()
        WHERE scenario_name = 'packet-heist'
          AND drop_number = 2
          AND title = 'PACKET HEIST — Drop 2: Cross-Victim Correlation'`,
      { replacements: { briefing: DROP_2_BRIEFING } },
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('assignments', 'launch_briefing');
  },
};
