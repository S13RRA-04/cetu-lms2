'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('case_timelines', {
      id:         { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      squad_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'squads',  key: 'id' }, onDelete: 'CASCADE' },
      course_id:  { type: Sequelize.UUID, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      state:      { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX case_timelines_squad_course ON case_timelines (squad_id, course_id)`
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable('case_timelines');
  },
};
