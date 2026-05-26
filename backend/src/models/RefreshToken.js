'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RefreshToken = sequelize.define(
    'RefreshToken',
    {
      id:         { type: DataTypes.UUID,       defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id:    { type: DataTypes.UUID,       allowNull: false },
      token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      expires_at: { type: DataTypes.DATE,       allowNull: false },
      revoked:    { type: DataTypes.BOOLEAN,    defaultValue: false },
    },
    { tableName: 'refresh_tokens' }
  );

  return RefreshToken;
};
