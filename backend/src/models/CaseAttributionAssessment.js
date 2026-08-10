'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CaseAttributionAssessment', {
  id:                { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:           { type: DataTypes.UUID, allowNull: false },
  squad_id:          { type: DataTypes.UUID, allowNull: false },
  subject_entity_id: { type: DataTypes.UUID, allowNull: false },
  dimensions:        { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  updated_by:        { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'case_attribution_assessments',
});
