'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LtiToolRegistration = sequelize.define(
    'LtiToolRegistration',
    {
      id:              { type: DataTypes.UUID,        defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name:            { type: DataTypes.STRING(255), allowNull: false },
      client_id:       { type: DataTypes.STRING(255), allowNull: false, unique: true },
      platform_url:    { type: DataTypes.STRING(512), allowNull: false },
      auth_endpoint:   { type: DataTypes.STRING(512), allowNull: false },
      token_endpoint:  { type: DataTypes.STRING(512), allowNull: false },
      jwks_endpoint:   { type: DataTypes.STRING(512), allowNull: false },
      deployment_ids:  { type: DataTypes.JSONB,       allowNull: false, defaultValue: [] },
      is_active:       { type: DataTypes.BOOLEAN,     defaultValue: true },
    },
    { tableName: 'lti_tool_registrations' }
  );

  return LtiToolRegistration;
};
