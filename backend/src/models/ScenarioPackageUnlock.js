'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'ScenarioPackageUnlock',
  {
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    package_id:  { type: DataTypes.UUID, allowNull: false },
    cohort_id:   { type: DataTypes.UUID, allowNull: false },
    unlocked_by: { type: DataTypes.UUID, allowNull: true },
    unlocked_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: 'scenario_package_unlocks', timestamps: false }
);
