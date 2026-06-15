'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CampaignDropUnlock', {
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  drop_id:     { type: DataTypes.UUID, allowNull: false },
  cohort_id:   { type: DataTypes.UUID, allowNull: false },
  unlocked_by: { type: DataTypes.UUID, allowNull: true },
  unlocked_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'campaign_drop_unlocks',
  indexes: [{ unique: true, fields: ['drop_id', 'cohort_id'] }],
});
