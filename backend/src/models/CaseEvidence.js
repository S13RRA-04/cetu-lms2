'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CaseEvidence', {
  id:                       { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:                  { type: DataTypes.UUID, allowNull: false },
  evidence_key:              { type: DataTypes.STRING(100), allowNull: false },
  source_type:               { type: DataTypes.STRING(100), allowNull: false },
  authoritative_facts:       { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  artifact_template:         { type: DataTypes.TEXT, allowNull: true },
  rendered_artifact:         { type: DataTypes.TEXT, allowNull: true },
  unlock_conditions:         { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  related_entity_ids:        { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  legal_authority_required:  { type: DataTypes.STRING(64), allowNull: true },
  reliability:                { type: DataTypes.STRING(64), allowNull: true },
  role_relevance:             { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
}, {
  tableName: 'case_evidence',
});
