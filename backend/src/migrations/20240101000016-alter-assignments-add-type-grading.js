'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_assignments_type AS ENUM ('module','game','assessment','survey','challenge','capstone');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE enum_assignments_grading_mode AS ENUM ('individual','squad');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryInterface.addColumn('assignments', 'type', {
      type:         Sequelize.ENUM('module','game','assessment','survey','challenge','capstone'),
      allowNull:    false,
      defaultValue: 'module',
    });
    await queryInterface.addColumn('assignments', 'grading_mode', {
      type:         Sequelize.ENUM('individual','squad'),
      allowNull:    false,
      defaultValue: 'individual',
    });
    await queryInterface.addColumn('assignments', 'order_index', {
      type:         Sequelize.INTEGER,
      allowNull:    false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('assignments', 'type');
    await queryInterface.removeColumn('assignments', 'grading_mode');
    await queryInterface.removeColumn('assignments', 'order_index');
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_assignments_type;
      DROP TYPE IF EXISTS enum_assignments_grading_mode;
    `);
  },
};
