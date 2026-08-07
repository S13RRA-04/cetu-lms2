'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CaseInterview', {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:         { type: DataTypes.UUID, allowNull: false },
  squad_id:        { type: DataTypes.UUID, allowNull: false },
  persona_id:      { type: DataTypes.UUID, allowNull: false },
  student_id:      { type: DataTypes.UUID, allowNull: true },
  transcript:      { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  facts_disclosed: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  status:          { type: DataTypes.ENUM('in_progress', 'concluded'), allowNull: false, defaultValue: 'in_progress' },
}, {
  tableName: 'case_interviews',
});
