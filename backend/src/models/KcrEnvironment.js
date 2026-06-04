'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'KcrEnvironment',
  {
    id:          { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
    course_id:   { type: DataTypes.UUID,        allowNull: true },
    name:        { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT,        allowNull: true },
    is_active:   { type: DataTypes.BOOLEAN,     defaultValue: true },
  },
  { tableName: 'kcr_environments' }
);
