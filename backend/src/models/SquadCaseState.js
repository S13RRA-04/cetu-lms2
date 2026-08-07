'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('SquadCaseState', {
  id:                      { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:                 { type: DataTypes.UUID, allowNull: false },
  squad_id:                { type: DataTypes.UUID, allowNull: false },
  phase:                   { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'intake' },
  discovered_entity_ids:   { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  discovered_evidence_ids: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  active_leads:            { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  open_questions:          { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  updated_by:              { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'squad_case_states',
});
