'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('campaign_drop_puzzles', {
      id:          { type: Sequelize.UUID, primaryKey: true, defaultValue: Sequelize.literal('gen_random_uuid()') },
      drop_id:     { type: Sequelize.UUID, allowNull: false, references: { model: 'campaign_drops', key: 'id' }, onDelete: 'CASCADE' },
      // Plain VARCHAR, not a Postgres ENUM — new puzzle types are added at the
      // Joi validation layer only, so this table never needs a migration for one.
      puzzle_type: { type: Sequelize.STRING(32), allowNull: false },
      order_index: { type: Sequelize.SMALLINT, allowNull: false, defaultValue: 0 },
      enabled:     { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      prompt:      { type: Sequelize.TEXT, allowNull: true },
      // Literal expected answer for types that store one (cipher_wheel, log_grep).
      // Must stay NULL for hash_match, whose answer is computed at verify time.
      answer:      { type: Sequelize.STRING(255), allowNull: true },
      config:      { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      created_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at:  { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });
    await queryInterface.addIndex('campaign_drop_puzzles', ['drop_id', 'order_index']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('campaign_drop_puzzles');
  },
};
