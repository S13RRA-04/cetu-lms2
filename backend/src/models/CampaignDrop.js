'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CampaignDrop', {
  id:              { type: DataTypes.UUID,     primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  course_id:       { type: DataTypes.UUID,     allowNull: false },
  number:          { type: DataTypes.SMALLINT, allowNull: false },
  title:           { type: DataTypes.STRING(255), allowNull: false },
  scenario_name:   { type: DataTypes.STRING(255), allowNull: true },
  // Command Post bulletin — shown to students when this drop unlocks
  narrative_intro: { type: DataTypes.TEXT,        allowNull: true },
  // Vault cipher challenge — shown to students; vault_pin is the expected answer
  vault_hint:      { type: DataTypes.TEXT,        allowNull: true },
  vault_pin:       { type: DataTypes.STRING(64),  allowNull: true },
  vault_enabled:   { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: true },
  // HTML easter-egg signal — injected into page <head> as a comment; student must find and enter it
  html_signal:     { type: DataTypes.STRING(128), allowNull: true },
  signal_prompt:   { type: DataTypes.TEXT,        allowNull: true },
  signal_enabled:  { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: true },
}, {
  tableName: 'campaign_drops',
  indexes: [{ unique: true, fields: ['course_id', 'number'] }],
});
