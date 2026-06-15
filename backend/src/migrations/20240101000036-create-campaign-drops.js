'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('campaign_drops', {
      id:              { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      course_id:       { type: Sequelize.UUID, allowNull: false, references: { model: 'courses', key: 'id' }, onDelete: 'CASCADE' },
      number:          { type: Sequelize.SMALLINT, allowNull: false },
      title:           { type: Sequelize.STRING(255), allowNull: false },
      narrative_intro: { type: Sequelize.TEXT, allowNull: true },
      created_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:      { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('campaign_drops', ['course_id', 'number'], { unique: true });

    await queryInterface.createTable('campaign_drop_unlocks', {
      id:          { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      drop_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'campaign_drops', key: 'id' }, onDelete: 'CASCADE' },
      cohort_id:   { type: Sequelize.UUID, allowNull: false, references: { model: 'cohorts', key: 'id' }, onDelete: 'CASCADE' },
      unlocked_by: { type: Sequelize.UUID, allowNull: true },
      unlocked_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('campaign_drop_unlocks', ['drop_id', 'cohort_id'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('campaign_drop_unlocks');
    await queryInterface.dropTable('campaign_drops');
  },
};
