'use strict';
const { DataTypes } = require('sequelize');

// type controls the icon and colour band shown on the map
const ARTIFACT_TYPES = ['physical', 'digital', 'personnel', 'inject'];

module.exports = (sequelize) => sequelize.define(
  'KcrArtifact',
  {
    id:             { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
    environment_id: { type: DataTypes.UUID,        allowNull: false },
    type:           { type: DataTypes.ENUM(...ARTIFACT_TYPES), allowNull: false },
    name:           { type: DataTypes.STRING(255), allowNull: false },
    description:    { type: DataTypes.TEXT,        allowNull: true },
    icon_label:     { type: DataTypes.STRING(8),   allowNull: true },  // short callsign shown on marker
    color:          { type: DataTypes.STRING(32),  allowNull: true },  // optional override
    metadata:       { type: DataTypes.JSONB,       defaultValue: {} }, // type-specific fields
  },
  { tableName: 'kcr_artifacts' }
);
