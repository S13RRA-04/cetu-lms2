'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'IntelBoard',
  {
    id:            { type: DataTypes.UUID,   defaultValue: DataTypes.UUIDV4, primaryKey: true },
    squad_id:      { type: DataTypes.UUID,   allowNull: true },
    course_id:     { type: DataTypes.UUID,   allowNull: false },
    nodes:         { type: DataTypes.JSONB,  allowNull: false, defaultValue: [] },
    edges:         { type: DataTypes.JSONB,  allowNull: false, defaultValue: [] },
    notes:         { type: DataTypes.TEXT,   allowNull: true },
    last_saved_by: { type: DataTypes.UUID,   allowNull: true },
  },
  { tableName: 'intel_boards' }
);
