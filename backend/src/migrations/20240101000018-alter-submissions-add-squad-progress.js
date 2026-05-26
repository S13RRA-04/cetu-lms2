'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('submissions', 'squad_id', {
      type:       Sequelize.UUID,
      allowNull:  true,
      references: { model: 'squads', key: 'id' },
      onDelete:   'SET NULL',
    });
    await queryInterface.addColumn('submissions', 'progress', {
      type:         Sequelize.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
    });
    // Add 'in_progress' to status enum
    await queryInterface.sequelize.query(
      `ALTER TYPE enum_submissions_status ADD VALUE IF NOT EXISTS 'in_progress' BEFORE 'submitted';`
    );
    await queryInterface.addIndex('submissions', ['squad_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('submissions', 'squad_id');
    await queryInterface.removeColumn('submissions', 'progress');
  },
};
