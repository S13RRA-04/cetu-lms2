'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cohort = sequelize.define(
    'Cohort',
    {
      id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name:      { type: DataTypes.STRING(200), allowNull: false },
      course_id: { type: DataTypes.UUID, allowNull: false },
      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      end_date:   { type: DataTypes.DATEONLY, allowNull: true },
      is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    { tableName: 'cohorts' }
  );

  return Cohort;
};
