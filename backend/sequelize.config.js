'use strict';
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
    dialect:  'postgres',
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + '_test',
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
    dialect:  'postgres',
  },
  production: process.env.DATABASE_URL ? {
    url:     process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
  } : {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
    dialect:  'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    migrationStorageTableName: 'sequelize_meta',
    seederStorage: 'sequelize',
    seederStorageTableName: 'sequelize_data',
  },
};
