'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PasswordResetToken = sequelize.define(
    'PasswordResetToken',
    {
      id:         { type: DataTypes.UUID,       defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id:    { type: DataTypes.UUID,       allowNull: false },
      token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE,       allowNull: false },
      used:       { type: DataTypes.BOOLEAN,    allowNull: false, defaultValue: false },
    },
    { tableName: 'password_reset_tokens' }
  );

  return PasswordResetToken;
};
