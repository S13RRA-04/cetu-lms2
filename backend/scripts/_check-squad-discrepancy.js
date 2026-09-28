'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { sequelize } = require('../src/config/database');

(async () => {
  const [rows] = await sequelize.query(`
    SELECT sq.number AS "squadNumber", sq.victim_code AS "victimCode",
           u.id AS "userId", u.first_name, u.last_name, u.role, u.email
    FROM squads sq
    JOIN enrollments e ON e.squad_id = sq.id AND e.course_id = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63'
    JOIN users u ON u.id = e.user_id
    WHERE sq.cohort_id = '8139412f-9db2-4ba4-8bb4-6cfd515294c3'
    ORDER BY sq.number, u.last_name
  `);
  console.log(JSON.stringify(rows, null, 1));
  console.log('Total rows:', rows.length);
  process.exit(0);
})();
