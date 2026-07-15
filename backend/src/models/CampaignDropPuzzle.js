'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CampaignDropPuzzle', {
  id:          { type: DataTypes.UUID,        primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  drop_id:     { type: DataTypes.UUID,        allowNull: false },
  puzzle_type: { type: DataTypes.STRING(32),  allowNull: false },
  order_index: { type: DataTypes.SMALLINT,    allowNull: false, defaultValue: 0 },
  enabled:     { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: true },
  prompt:      { type: DataTypes.TEXT,        allowNull: true },
  // Literal expected answer (cipher_wheel/log_grep). Must stay null for
  // hash_match, whose answer is computed at verify time from config.
  answer:      { type: DataTypes.STRING(255), allowNull: true },
  config:      { type: DataTypes.JSONB,       allowNull: false, defaultValue: {} },
}, {
  tableName: 'campaign_drop_puzzles',
  indexes: [{ fields: ['drop_id', 'order_index'] }],
});
