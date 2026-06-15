'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cell = sequelize.define(
    'Cell',
    {
      id:        { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
      cohort_id: { type: DataTypes.UUID,        allowNull: false },
      number:    { type: DataTypes.SMALLINT,    allowNull: false },
      name:      { type: DataTypes.STRING(100), allowNull: true },
    },
    { tableName: 'cells' }
  );

  return Cell;
};
