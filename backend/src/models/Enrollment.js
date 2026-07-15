'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Enrollment = sequelize.define(
    'Enrollment',
    {
      id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id:   { type: DataTypes.UUID, allowNull: false },
      course_id: { type: DataTypes.UUID, allowNull: false },
      role: {
        type:         DataTypes.ENUM('student', 'instructor', 'ta'),
        allowNull:    false,
        defaultValue: 'student',
      },
      status: {
        type:         DataTypes.ENUM('active', 'completed', 'withdrawn'),
        allowNull:    false,
        defaultValue: 'active',
      },
      enrolled_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      cohort_id:    { type: DataTypes.UUID, allowNull: true },
      squad_id:     { type: DataTypes.UUID, allowNull: true },
    },
    { tableName: 'enrollments' }
  );

  return Enrollment;
};
