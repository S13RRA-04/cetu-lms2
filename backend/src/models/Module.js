'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Module = sequelize.define(
    'Module',
    {
      id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      course_id:    { type: DataTypes.UUID,         allowNull: false },
      title:        { type: DataTypes.STRING(255),  allowNull: false },
      description:  { type: DataTypes.TEXT,         allowNull: true },
      order_index:  { type: DataTypes.INTEGER,      allowNull: false, defaultValue: 0 },
      is_published: { type: DataTypes.BOOLEAN,      defaultValue: false },
    },
    { tableName: 'modules' }
  );

  return Module;
};
