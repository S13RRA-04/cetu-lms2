'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CourseContentItem', {
  id:           { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  course_id:    { type: DataTypes.UUID, allowNull: false },
  title:        { type: DataTypes.STRING(255), allowNull: false },
  description:  { type: DataTypes.TEXT },
  content_type: { type: DataTypes.ENUM('slides', 'handout', 'agenda', 'form', 'resource'), defaultValue: 'resource' },
  url:          { type: DataTypes.TEXT },
  r2_key:       { type: DataTypes.STRING(512) },
  file_name:    { type: DataTypes.STRING(255) },
  file_size:    { type: DataTypes.BIGINT },
  order_index:  { type: DataTypes.INTEGER, defaultValue: 0 },
  is_published: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'course_content_items', underscored: true });
