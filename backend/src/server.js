'use strict';
require('dotenv').config();

const express      = require('express');
const path         = require('path');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');
const passport     = require('./config/passport');
const lti          = require('ltijs').Provider;
const Database     = require('ltijs-sequelize');

const { sequelize }     = require('./config/database');
const logger            = require('./utils/logger');
const errorHandler      = require('./middleware/errorHandler');
const { apiLimiter }    = require('./middleware/rateLimiter');

const authRoutes        = require('./routes/auth.routes');
const courseRoutes      = require('./routes/course.routes');
const userRoutes        = require('./routes/user.routes');
const ltiRoutes         = require('./routes/lti.routes');
const ltiService        = require('./services/lti.service');

const PORT = parseInt(process.env.PORT, 10) || 3001;

// ── LTI Provider Setup ────────────────────────────────────────────────────────
let ltiDb;
if (process.env.DATABASE_URL) {
  const u = new URL(process.env.DATABASE_URL);
  ltiDb = new Database(
    u.pathname.slice(1),          // database name
    u.username,
    u.password,
    {
      host:    u.hostname,
      port:    parseInt(u.port, 10) || 5432,
      dialect: 'postgres',
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    }
  );
} else {
  ltiDb = new Database(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    { host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT, 10) || 5432, dialect: 'postgres' }
  );
}

lti.setup(
  process.env.LTI_KEY,
  { plugin: ltiDb },
  {
    cookies: { secure: process.env.NODE_ENV === 'production', sameSite: 'None' },
    devMode: process.env.NODE_ENV !== 'production',
    tokenMaxAge: 60,
  }
);

lti.onConnect(ltiService.handleLaunch);
lti.onDeepLinking(ltiService.handleDeepLinking);

// ── Express App ───────────────────────────────────────────────────────────────
const app = express();

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(apiLimiter);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',    authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/users',   userRoutes);
app.use('/api/v1/lti',     ltiRoutes);

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Serve built frontend in production ────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const staticDir = path.join(__dirname, '../public');
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/lti')) return next();
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

app.use(errorHandler);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    await lti.deploy({ serverless: true });
    app.use(lti.app);
    logger.info('LTI provider deployed');

    app.listen(PORT, () => {
      logger.info(`CETU LMS backend running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
