'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CourseContentUnlock', {
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  content_id:  { type: DataTypes.UUID, allowNull: false },
  cohort_id:   { type: DataTypes.UUID, allowNull: false },
  unlocked_by: { type: DataTypes.UUID },
  unlocked_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'course_content_unlocks', underscored: true, timestamps: false });
