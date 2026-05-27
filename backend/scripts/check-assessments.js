'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});

(async () => {
  await seq.authenticate();
  const [rows] = await seq.query(
    `SELECT id, title, type, is_published, order_index, lti_resource_link_id, created_at
     FROM assignments
     WHERE type IN ('assessment','survey')
     ORDER BY type, order_index, created_at`,
  );
  console.table(rows.map(r => ({
    id: r.id.slice(0,8),
    title: r.title,
    type: r.type,
    published: r.is_published,
    order_index: r.order_index,
    lti_id: r.lti_resource_link_id,
    created: r.created_at?.toISOString().slice(0,19),
  })));
  await seq.close();
})().catch((e) => { console.error(e); process.exit(1); });
