'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define(
  'SquadChallengeState',
  {
    id:            { type: DataTypes.UUID,  defaultValue: DataTypes.UUIDV4, primaryKey: true },
    assignment_id: { type: DataTypes.UUID,  allowNull: false },
    squad_id:      { type: DataTypes.UUID,  allowNull: false },
    quiz_state:    { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    updated_by:    { type: DataTypes.UUID,  allowNull: true },
  },
  { tableName: 'squad_challenge_states' }
);
