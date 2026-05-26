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
      is_active:  { type: DataTypes.BOOLEAN, defaultValue: true },
      last_login: { type: DataTypes.DATE,    allowNull: true },
    },
    {
      tableName: 'users',
      defaultScope: {
        attributes: { exclude: ['password_hash'] },
      },
      scopes: {
        withPassword: { attributes: {} },
      },
    }
  );

  return User;
};
