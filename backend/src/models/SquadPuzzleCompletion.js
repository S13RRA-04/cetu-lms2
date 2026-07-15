'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('SquadPuzzleCompletion', {
  id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  course_id:       { type: DataTypes.UUID, allowNull: false },
  drop_id:         { type: DataTypes.UUID, allowNull: false },
  puzzle_id:       { type: DataTypes.UUID, allowNull: false },
  squad_id:        { type: DataTypes.UUID, allowNull: false },
  first_solver_id: { type: DataTypes.UUID, allowNull: false },
  points_awarded:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
  solved_at:       { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'squad_puzzle_completions' });
