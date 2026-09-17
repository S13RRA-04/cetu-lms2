'use strict';
/**
 * backend/.env's DATABASE_URL is a stale Neon connection string (quota
 * exhausted, migration to Supabase documented in docs/neon.md) — it is NOT
 * the live database. The live app (confirmed against the Render service's
 * env-vars API) connects via PACT_SUPABASE_SESSION_POOL.
 *
 * This matters beyond this module's own connection: backend/src/config/
 * database.js builds the *application's* Sequelize instance from bare
 * process.env.DATABASE_URL at first require, and every service under
 * backend/src/services (e.g. courseContent.service.js's syncDropCaseFiles)
 * goes through that instance via the models layer. A script that calls into
 * app services without also fixing DATABASE_URL will silently read/write
 * the dead Neon DB through that path even while its own raw queries
 * correctly hit Supabase — exactly what happened seeding Drop 1's evidence
 * sync. Requiring this module overrides process.env.DATABASE_URL as a side
 * effect, so require it before any require of backend/src/services or
 * backend/src/models.
 */

process.env.DATABASE_URL = process.env.PACT_SUPABASE_SESSION_POOL;

const { Sequelize } = require('sequelize');

function getLiveSequelize() {
  const connectionString = process.env.PACT_SUPABASE_SESSION_POOL;
  if (!connectionString) throw new Error('PACT_SUPABASE_SESSION_POOL is required (see backend/.env)');
  return new Sequelize(connectionString, {
    dialect: 'postgres',
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    logging: false,
  });
}

module.exports = { getLiveSequelize };
