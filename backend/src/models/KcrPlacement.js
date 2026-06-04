'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'KcrPlacement',
  {
    id:          { type: DataTypes.UUID,    defaultValue: DataTypes.UUIDV4, primaryKey: true },
    room_id:     { type: DataTypes.UUID,    allowNull: false },
    artifact_id: { type: DataTypes.UUID,    allowNull: false },
    x_pct:       { type: DataTypes.FLOAT,  allowNull: false },  // 0–100
    y_pct:       { type: DataTypes.FLOAT,  allowNull: false },  // 0–100
    notes:       { type: DataTypes.TEXT,   allowNull: true },
    rotate_deg:  { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { tableName: 'kcr_placements' }
);
