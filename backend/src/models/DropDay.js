'use strict';
const { DataTypes } = require('sequelize');

// The course day one (scenario, drop) pair is taught on — see migration 094.
// scenario_name is '' (never null) for drop-tagged assignments with no
// scenario, so the unique index can't be sidestepped by NULLs.
module.exports = (sequelize) => sequelize.define('DropDay', {
  id:            { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  course_id:     { type: DataTypes.UUID, allowNull: false },
  scenario_name: { type: DataTypes.STRING(255), allowNull: false, defaultValue: '' },
  drop_number:   { type: DataTypes.SMALLINT, allowNull: false },
  course_day:    { type: DataTypes.SMALLINT, allowNull: false },
}, {
  tableName: 'drop_days',
  indexes: [{ unique: true, fields: ['course_id', 'scenario_name', 'drop_number'] }],
});
