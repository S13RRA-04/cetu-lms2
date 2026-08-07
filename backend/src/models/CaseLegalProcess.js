'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CaseLegalProcess', {
  id:                    { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:               { type: DataTypes.UUID, allowNull: false },
  squad_id:              { type: DataTypes.UUID, allowNull: false },
  requested_by:          { type: DataTypes.UUID, allowNull: true },
  request_type:          { type: DataTypes.STRING(64), allowNull: false },
  target_entity_id:      { type: DataTypes.UUID, allowNull: true },
  status:                { type: DataTypes.ENUM('pending', 'approved', 'denied'), allowNull: false, defaultValue: 'pending' },
  required_elements_met: { type: DataTypes.JSONB, allowNull: true },
  transcript:            { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  unlocked_evidence_ids: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  decided_at:            { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'case_legal_processes',
});
