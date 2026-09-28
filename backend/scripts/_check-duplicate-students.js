'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const { sequelize } = require('../src/config/database');

(async () => {
  const [rows] = await sequelize.query(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.is_active, u.last_login, u.created_at,
           (SELECT count(*) FROM submissions s WHERE s.user_id = u.id) AS submission_count
    FROM enrollments e
    JOIN users u ON u.id = e.user_id AND u.role = 'student'
    WHERE e.course_id = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63'
      AND e.cohort_id = '8139412f-9db2-4ba4-8bb4-6cfd515294c3'
      AND (u.first_name ILIKE 'Alison' OR u.first_name ILIKE 'Albert' OR u.last_name ILIKE 'X' OR u.last_name ILIKE 'Poco' OR u.first_name ILIKE 'Poco')
    ORDER BY u.last_name, u.first_name
  `);
  console.log(JSON.stringify(rows, null, 1));
  process.exit(0);
})();
