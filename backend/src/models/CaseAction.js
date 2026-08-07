'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CaseAction', {
  id:                  { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:             { type: DataTypes.UUID, allowNull: false },
  squad_id:            { type: DataTypes.UUID, allowNull: false },
  student_id:          { type: DataTypes.UUID, allowNull: true },
  role:                { type: DataTypes.STRING(64), allowNull: true },
  action_type:         { type: DataTypes.STRING(100), allowNull: false },
  target_entity_id:    { type: DataTypes.UUID, allowNull: true },
  target_evidence_id:  { type: DataTypes.UUID, allowNull: true },
  justification_text:  { type: DataTypes.TEXT, allowNull: true },
  extracted_intent:    { type: DataTypes.JSONB, allowNull: true },
  status:              { type: DataTypes.ENUM('pending', 'completed', 'denied'), allowNull: false, defaultValue: 'pending' },
  result:              { type: DataTypes.JSONB, allowNull: true },
  is_inject:           { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'case_actions',
});
