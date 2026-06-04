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

if (process.env.LOGTAIL_SOURCE_TOKEN) {
  const { Logtail }       = require('@logtail/node');
  const { LogtailTransport } = require('@logtail/winston');
  const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);
  loggerTransports.push(new LogtailTransport(logtail));
}

const logger = createLogger({
  level:      process.env.LOG_LEVEL || 'info',
  format:     format.combine(format.timestamp(), format.json()),
  transports: loggerTransports,
});

module.exports = logger;
