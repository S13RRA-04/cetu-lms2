'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('DropLocationSelection', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  drop_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  location_code: { type: DataTypes.STRING(64), allowNull: false },
}, { tableName: 'drop_location_selections' });
