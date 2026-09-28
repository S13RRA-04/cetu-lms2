'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { Cohort } = require('../src/models');
(async () => {
  const c = await Cohort.findByPk('8139412f-9db2-4ba4-8bb4-6cfd515294c3');
  console.log(JSON.stringify({ start_date: c.start_date, end_date: c.end_date, created_at: c.created_at }, null, 1));
  process.exit(0);
})();
