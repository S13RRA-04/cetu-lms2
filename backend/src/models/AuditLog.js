'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id:            { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
      user_id:       { type: DataTypes.UUID,        allowNull: true },
      action:        { type: DataTypes.STRING(100), allowNull: false },
      resource_type: { type: DataTypes.STRING(100), allowNull: false },
      resource_id:   { type: DataTypes.UUID,        allowNull: true },
      metadata:      { type: DataTypes.JSONB,       allowNull: true },
      ip_address:    { type: DataTypes.STRING(45),  allowNull: true },
    },
    { tableName: 'audit_logs', updatedAt: false }
  );

  return AuditLog;
};
