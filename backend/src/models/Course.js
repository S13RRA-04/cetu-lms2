'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Course = sequelize.define(
    'Course',
    {
      id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      title:       { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT,        allowNull: true },
      course_code: { type: DataTypes.STRING(50),  allowNull: false, unique: true },
      instructor_id: { type: DataTypes.UUID,      allowNull: true },
      status: {
        type:         DataTypes.ENUM('draft', 'published', 'archived'),
        allowNull:    false,
        defaultValue: 'draft',
      },
      thumbnail_url: { type: DataTypes.STRING(512), allowNull: true },
      start_date:    { type: DataTypes.DATEONLY,    allowNull: true },
      end_date:      { type: DataTypes.DATEONLY,    allowNull: true },
    },
    { tableName: 'courses' }
  );

  return Course;
};
