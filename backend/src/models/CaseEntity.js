'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CaseEntity', {
  id:         { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  case_id:    { type: DataTypes.UUID, allowNull: false },
  type:       { type: DataTypes.STRING(50), allowNull: false },
  name:       { type: DataTypes.STRING(255), allowNull: false },
  aliases:    { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  attributes: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  notes:      { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'case_entities',
});
