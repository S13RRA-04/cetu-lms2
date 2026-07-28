'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('LegalRequest', {
  id:                     { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  assignment_id:          { type: DataTypes.UUID, allowNull: false },
  user_id:                { type: DataTypes.UUID, allowNull: false },
  request_type:           { type: DataTypes.STRING(64), allowNull: false, defaultValue: 'search_warrant' },
  status:                 { type: DataTypes.ENUM('pending', 'approved', 'denied'), allowNull: false, defaultValue: 'pending' },
  required_elements_met:  { type: DataTypes.JSONB, allowNull: true },
  transcript:             { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  unlocked_evidence_keys: { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: [] },
  decided_at:             { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'legal_requests',
});
