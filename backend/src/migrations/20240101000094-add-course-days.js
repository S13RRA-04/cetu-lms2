'use strict';
// Course-day scheduling for Command's Content workspace (organization only —
// student lists still sort by order_index alone).
//  - assignments.course_day: an explicit per-item override.
//  - drop_days: one day per (scenario, drop) pair, inherited by every
//    assignment in that drop unless it has its own course_day. Keyed on the
//    pair rather than campaign_drops, because many drop-tagged assignments
//    (legacy drops, brokered-exit) have no campaign_drops row at all.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_day SMALLINT DEFAULT NULL'
    );
    await queryInterface.createTable('drop_days', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      course_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      scenario_name: { type: Sequelize.STRING(255), allowNull: false, defaultValue: '' },
      drop_number:   { type: Sequelize.SMALLINT, allowNull: false },
      course_day:    { type: Sequelize.SMALLINT, allowNull: false },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.sequelize.query(
      'CREATE UNIQUE INDEX drop_days_course_scenario_drop ON drop_days (course_id, scenario_name, drop_number)'
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable('drop_days');
    await queryInterface.removeColumn('assignments', 'course_day');
  },
};
