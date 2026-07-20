'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CourseContentItem', {
  id:           { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  course_id:    { type: DataTypes.UUID, allowNull: false },
  title:        { type: DataTypes.STRING(255), allowNull: false },
  description:  { type: DataTypes.TEXT },
  content_type: {
    type: DataTypes.ENUM('slides', 'handout', 'agenda', 'form', 'resource', 'briefing', 'evidence', 'intel_report'),
    defaultValue: 'resource',
  },
  url:          { type: DataTypes.TEXT },
  r2_key:       { type: DataTypes.STRING(512) },
  file_name:    { type: DataTypes.STRING(255) },
  file_size:    { type: DataTypes.BIGINT },
  scenario_name:       { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  source_drop_number:  { type: DataTypes.SMALLINT, allowNull: true, defaultValue: null },
  source_victim_code:  { type: DataTypes.STRING(20), allowNull: true, defaultValue: null },
  source_folder:       { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  drop_number:          { type: DataTypes.SMALLINT, allowNull: true, defaultValue: null },
  victim_code:          { type: DataTypes.STRING(20), allowNull: true, defaultValue: null },
  // Per-student self-report gate — set alongside drop_number/scenario_name;
  // hidden from a student until their DropLocationSelection for that drop
  // matches. See utils/dropLocation.js.
  location_code:        { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
  linked_assignment_id: { type: DataTypes.UUID,     allowNull: true, defaultValue: null },
  role_filters:         { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: [] },
  order_index:          { type: DataTypes.INTEGER,  defaultValue: 0 },
  is_published: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'course_content_items', underscored: true });
