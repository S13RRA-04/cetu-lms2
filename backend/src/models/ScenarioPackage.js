'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'ScenarioPackage',
  {
    id:             { type: DataTypes.UUID,         defaultValue: DataTypes.UUIDV4, primaryKey: true },
    course_id:      { type: DataTypes.UUID,         allowNull: false },
    scenario_name:  { type: DataTypes.STRING(255),  allowNull: false, defaultValue: '' },
    title:          { type: DataTypes.STRING(255),  allowNull: false },
    description:    { type: DataTypes.TEXT,         allowNull: true },
    r2_key:         { type: DataTypes.STRING(512),  allowNull: false },
    file_name:      { type: DataTypes.STRING(255),  allowNull: false },
    release_number: { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 1 },
    is_published:   { type: DataTypes.BOOLEAN,      defaultValue: false },
  },
  { tableName: 'scenario_packages' }
);
