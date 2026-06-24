'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Grade = sequelize.define(
    'Grade',
    {
      id:            { type: DataTypes.UUID,         defaultValue: DataTypes.UUIDV4, primaryKey: true },
      assignment_id: { type: DataTypes.UUID,         allowNull: false },
      user_id:       { type: DataTypes.UUID,         allowNull: false },
      score:         { type: DataTypes.DECIMAL(8,2), allowNull: false },
      max_score:     { type: DataTypes.DECIMAL(8,2), allowNull: false },
      feedback:      { type: DataTypes.TEXT,         allowNull: true },
      graded_at:     { type: DataTypes.DATE,         allowNull: true },
      graded_by:     { type: DataTypes.UUID,         allowNull: true },
      lti_score_id:  { type: DataTypes.STRING(512),  allowNull: true },
      prompt_scores: { type: DataTypes.JSONB,         allowNull: true },
    },
    { tableName: 'grades' }
  );

  return Grade;
};
