'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('intel_boards', {
      id:            { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      squad_id:      { type: Sequelize.UUID, allowNull: true,  references: { model: 'squads',  key: 'id' }, onDelete: 'CASCADE' },
      course_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      nodes:         { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      edges:         { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      notes:         { type: Sequelize.TEXT, allowNull: true },
      last_saved_by: { type: Sequelize.UUID, allowNull: true },
      created_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:    { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    // Partial unique indexes to handle nullable squad_id
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX intel_boards_squad_course ON intel_boards (squad_id, course_id) WHERE squad_id IS NOT NULL`
    );
  },
  async down(queryInterface) {
    await queryInterface.dropTable('intel_boards');
  },
};
