'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Squad = sequelize.define(
    'Squad',
    {
      id:        { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
      cohort_id: { type: DataTypes.UUID,        allowNull: false },
      number:    { type: DataTypes.SMALLINT,    allowNull: false },
      name:      { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'squads' }
  );

  return Squad;
};
