'use strict';
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Application Sequelize instance.
// ltijs-sequelize creates its own separate instance internally — do not mix them.
const opts = {
  dialect: 'postgres',
  logging: (msg) => { if (process.env.NODE_ENV === 'development') logger.debug(msg); },
  pool:    { max: 5, min: 1, acquire: 30000, idle: 10000 },
  define:  { underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' },
  dialectOptions: process.env.DATABASE_URL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, opts)
  : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      ...opts,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10) || 5432,
    });

module.exports = { sequelize, Sequelize };
