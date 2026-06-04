'use strict';
const { createLogger, format, transports } = require('winston');

const isProd = process.env.NODE_ENV === 'production';

const loggerTransports = [
  new transports.Console({
    format: isProd
      ? format.combine(format.timestamp(), format.json())
      : format.combine(format.colorize(), format.simple()),
  }),
];

if (process.env.LOKI_URL) {
  try {
    const LokiTransport = require('winston-loki');
    loggerTransports.push(new LokiTransport({
      host:             process.env.LOKI_URL,
      basicAuth:        process.env.LOKI_BASIC_AUTH || undefined,
      labels:           { app: 'cetu-lms', env: process.env.NODE_ENV ?? 'production' },
      json:             true,
      batching:         true,
      interval:         5,
      onConnectionError: () => {},
    }));
  } catch {
    // Loki unavailable — console only
  }
}

const logger = createLogger({
  level:      process.env.LOG_LEVEL || 'info',
  format:     format.combine(format.timestamp(), format.json()),
  transports: loggerTransports,
});

module.exports = logger;
