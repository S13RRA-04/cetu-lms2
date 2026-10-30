'use strict';
const { DataTypes } = require('sequelize');

// A lightning-round duel between students tied for first — see migration 095.
module.exports = (sequelize) => sequelize.define('TiebreakDuel', {
  id:               { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  course_id:        { type: DataTypes.UUID, allowNull: false },
  cohort_id:        { type: DataTypes.UUID, allowNull: false },
  status:           { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'ready' }, // ready | live | finished | cancelled
  practice:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  participant_ids:  { type: DataTypes.ARRAY(DataTypes.UUID), allowNull: false },
  questions:        { type: DataTypes.JSONB, allowNull: false },
  round:            { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
  round_started_at: { type: DataTypes.DATE, allowNull: true },
  answers:          { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  winner_id:        { type: DataTypes.UUID, allowNull: true },
  created_by:       { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'tiebreak_duels' });
