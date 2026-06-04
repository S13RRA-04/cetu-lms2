'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'KcrVenue',
  {
    id:             { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
    environment_id: { type: DataTypes.UUID,        allowNull: false },
    name:           { type: DataTypes.STRING(255), allowNull: false },
    address:        { type: DataTypes.STRING(512), allowNull: true },
    description:    { type: DataTypes.TEXT,        allowNull: true },
    sort_order:     { type: DataTypes.INTEGER,     defaultValue: 0 },
  },
  { tableName: 'kcr_venues' }
);
