'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'KcrRoom',
  {
    id:              { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
    venue_id:        { type: DataTypes.UUID,        allowNull: false },
    name:            { type: DataTypes.STRING(255), allowNull: false },
    description:     { type: DataTypes.TEXT,        allowNull: true },
    floor_plan_key:  { type: DataTypes.STRING(512), allowNull: true },
    sort_order:      { type: DataTypes.INTEGER,     defaultValue: 0 },
  },
  { tableName: 'kcr_rooms' }
);
