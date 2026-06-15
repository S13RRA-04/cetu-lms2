'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CampaignDrop', {
  id:              { type: DataTypes.UUID,     primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  course_id:       { type: DataTypes.UUID,     allowNull: false },
  number:          { type: DataTypes.SMALLINT, allowNull: false },
  title:           { type: DataTypes.STRING(255), allowNull: false },
  // Command Post bulletin — shown to students when this drop unlocks
  narrative_intro: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'campaign_drops',
  indexes: [{ unique: true, fields: ['course_id', 'number'] }],
});
