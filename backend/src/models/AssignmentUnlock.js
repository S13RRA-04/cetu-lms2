'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssignmentUnlock = sequelize.define(
    'AssignmentUnlock',
    {
      id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      assignment_id: { type: DataTypes.UUID, allowNull: false },
      cohort_id:     { type: DataTypes.UUID, allowNull: false },
      squad_id:      { type: DataTypes.UUID, allowNull: true },
      unlocked_by:   { type: DataTypes.UUID, allowNull: true },
      unlocked_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'assignment_unlocks' }
  );

  return AssignmentUnlock;
};
