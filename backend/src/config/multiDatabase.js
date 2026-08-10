'use strict';
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Multi-database connection registry — used ONLY by the `frontend` (general
 * CETU LMS shell) backend deployment, for its genuinely cross-program admin
 * views (Program Overview, platform-wide course/user management). The
 * pact-app/lair-app/kcr-app backends each stay single-connection via
 * config/database.js as before; they never touch this file, since each of
 * them only ever operates on its own single course.
 *
 * Requires LAIR_DATABASE_URL / PACT_DATABASE_URL / KCR_DATABASE_URL — the
 * three now-physically-separate program databases. A program whose env var
 * isn't set is skipped everywhere this registry is consulted (logged once
 * at startup) rather than throwing, so `frontend` still runs in a
 * partially-configured environment (e.g. local dev with only one DB handy)
 * instead of every admin page breaking outright.
 */

const opts = {
  dialect: 'postgres',
  logging: (msg) => { if (process.env.NODE_ENV === 'development') logger.debug(msg); },
  pool: { max: 5, min: 1, acquire: 30000, idle: 10000 },
  define: { underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' },
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
};

const PROGRAM_ENV_VARS = {
  lair: 'LAIR_DATABASE_URL',
  pact: 'PACT_DATABASE_URL',
  kcr: 'KCR_DATABASE_URL',
};

const connections = {};
for (const [program, envVar] of Object.entries(PROGRAM_ENV_VARS)) {
  const url = process.env[envVar];
  if (url) connections[program] = new Sequelize(url, opts);
  else logger.warn(`[multiDatabase] Missing ${envVar} — cross-program admin views will skip ${program}.`);
}

/** [[program, sequelizeInstance], ...] for every configured program — for fan-out queries. */
function allConnections() {
  return Object.entries(connections);
}

function getConnection(program) {
  return connections[program] ?? null;
}

module.exports = { allConnections, getConnection };
