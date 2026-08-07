'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CaseEntityRelationship', {
  id:                { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:           { type: DataTypes.UUID, allowNull: false },
  from_entity_id:    { type: DataTypes.UUID, allowNull: false },
  to_entity_id:      { type: DataTypes.UUID, allowNull: false },
  relationship_type: { type: DataTypes.STRING(100), allowNull: false },
  attributes:        { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  evidence_ids:      { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
}, {
  tableName: 'case_entity_relationships',
});
