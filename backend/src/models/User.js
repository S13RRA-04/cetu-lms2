'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: {
        type:     DataTypes.STRING(255),
        allowNull: false,
        unique:   true,
        validate: { isEmail: true },
      },
      username:      { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: true },
      first_name:    { type: DataTypes.STRING(100), allowNull: false },
      last_name:     { type: DataTypes.STRING(100), allowNull: false },
      role: {
        type:         DataTypes.ENUM('superadmin', 'admin', 'instructor', 'student'),
        allowNull:    false,
        defaultValue: 'student',
      },
      professional_role: {
        type: DataTypes.ENUM(
          'special_agent',
          'intelligence_analyst',
          'operational_support_sos',
          'operational_support_da',
          'supervisory_special_agent',
          'supervisory_intelligence_analyst',
          'task_force_officer'
        ),
        allowNull: true,
        defaultValue: null,
      },
      onboarding_complete: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      certifications:      { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: [] },
      is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
      last_login: { type: DataTypes.DATE,    allowNull: true },
    },
    {
      tableName: 'users',
      defaultScope: {
        attributes: { exclude: ['password_hash'] },
      },
      scopes: {
        withPassword: { attributes: { exclude: [] } },
      },
    }
  );

  return User;
};
