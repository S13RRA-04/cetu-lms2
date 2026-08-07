'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CaseHypothesis', {
  id:                         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:                    { type: DataTypes.UUID, allowNull: false },
  squad_id:                   { type: DataTypes.UUID, allowNull: false },
  statement:                  { type: DataTypes.TEXT, allowNull: false },
  supporting_evidence_ids:    { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  contradicting_evidence_ids: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  assumptions:                { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  alternative_hypotheses:     { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  open_questions:             { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  confidence:                 { type: DataTypes.FLOAT, allowNull: true },
  status:                     { type: DataTypes.ENUM('active', 'revised', 'abandoned'), allowNull: false, defaultValue: 'active' },
  revision_of:                { type: DataTypes.UUID, allowNull: true },
  created_by:                 { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'case_hypotheses',
});
