'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add squad_id column (nullable — null means cohort-wide unlock)
    await queryInterface.addColumn('assignment_unlocks', 'squad_id', {
      type:       Sequelize.UUID,
      allowNull:  true,
      references: { model: 'squads', key: 'id' },
      onDelete:   'CASCADE',
    });

    await queryInterface.addIndex('assignment_unlocks', ['squad_id']);

    // Replace the old cohort-only unique constraint with two partial indexes:
    // 1. Cohort-wide unlocks (squad_id IS NULL): unique per (assignment, cohort)
    // 2. Squad-level unlocks (squad_id IS NOT NULL): unique per (assignment, squad)
    await queryInterface.removeConstraint('assignment_unlocks', 'assignment_unlocks_assignment_cohort_unique');

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX assignment_unlocks_cohort_wide_unique
      ON assignment_unlocks (assignment_id, cohort_id)
      WHERE squad_id IS NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX assignment_unlocks_squad_unique
      ON assignment_unlocks (assignment_id, squad_id)
      WHERE squad_id IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS assignment_unlocks_squad_unique`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS assignment_unlocks_cohort_wide_unique`);

    await queryInterface.addConstraint('assignment_unlocks', {
      fields: ['assignment_id', 'cohort_id'],
      type:   'unique',
      name:   'assignment_unlocks_assignment_cohort_unique',
    });

    await queryInterface.removeIndex('assignment_unlocks', ['squad_id']);
    await queryInterface.removeColumn('assignment_unlocks', 'squad_id');
  },
};
