'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Assignment = sequelize.define(
    'Assignment',
    {
      id:                   { type: DataTypes.UUID,         defaultValue: DataTypes.UUIDV4, primaryKey: true },
      course_id:            { type: DataTypes.UUID,         allowNull: false },
      title:                { type: DataTypes.STRING(255),  allowNull: false },
      description:          { type: DataTypes.TEXT,         allowNull: true },
      max_score:            { type: DataTypes.DECIMAL(8,2), allowNull: false, defaultValue: 100 },
      due_date:             { type: DataTypes.DATE,         allowNull: true },
      lti_resource_link_id: { type: DataTypes.STRING(255),  allowNull: true },
      lineitem_url:         { type: DataTypes.STRING(512),  allowNull: true },
      is_published:         { type: DataTypes.BOOLEAN,      defaultValue: false },
    },
    { tableName: 'assignments' }
  );

  return Assignment;
};
