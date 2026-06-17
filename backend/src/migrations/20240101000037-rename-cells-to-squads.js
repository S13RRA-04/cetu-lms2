'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameTable('cells', 'squads');
    await queryInterface.renameColumn('enrollments', 'cell_id',   'squad_id');
    await queryInterface.renameColumn('submissions', 'cell_id',   'squad_id');
  },

  async down(queryInterface) {
    await queryInterface.renameColumn('submissions', 'squad_id',  'cell_id');
    await queryInterface.renameColumn('enrollments', 'squad_id',  'cell_id');
    await queryInterface.renameTable('squads', 'cells');
  },
};
