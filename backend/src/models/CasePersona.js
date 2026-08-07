'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CasePersona', {
  id:                  { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:             { type: DataTypes.UUID, allowNull: false },
  role_type:           { type: DataTypes.STRING(50), allowNull: false },
  name:                { type: DataTypes.STRING(255), allowNull: false },
  known_facts:         { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  unknown_facts:       { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  allowed_disclosures: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  personality:         { type: DataTypes.TEXT, allowNull: true },
  objectives:          { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  constraints:         { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  related_entity_id:   { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'case_personas',
});
