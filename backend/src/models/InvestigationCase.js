'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('InvestigationCase', {
  id:                  { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  assignment_id:       { type: DataTypes.UUID, allowNull: false },
  slug:                { type: DataTypes.STRING(100), allowNull: false },
  title:               { type: DataTypes.STRING(255), allowNull: false },
  synopsis:            { type: DataTypes.TEXT, allowNull: true },
  learning_objectives: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  legal_process_rules: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  status:              { type: DataTypes.ENUM('draft', 'published'), allowNull: false, defaultValue: 'draft' },
}, {
  tableName: 'investigation_cases',
});
