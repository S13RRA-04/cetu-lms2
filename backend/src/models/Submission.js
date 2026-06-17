'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Submission = sequelize.define(
    'Submission',
    {
      id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      assignment_id: { type: DataTypes.UUID, allowNull: false },
      user_id:       { type: DataTypes.UUID, allowNull: false },
      content:       { type: DataTypes.TEXT, allowNull: true },
      submitted_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      status: {
        type:         DataTypes.ENUM('in_progress', 'submitted', 'graded', 'returned'),
        allowNull:    false,
        defaultValue: 'in_progress',
      },
      squad_id: { type: DataTypes.UUID, allowNull: true },
      progress: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'submissions' }
  );

  return Submission;
};
