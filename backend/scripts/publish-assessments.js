'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize, DataTypes } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
});

const Assignment = seq.define('Assignment', {
  id:           { type: DataTypes.UUID,    primaryKey: true },
  type:         { type: DataTypes.STRING },
  is_published: { type: DataTypes.BOOLEAN },
  title:        { type: DataTypes.STRING },
}, { tableName: 'assignments', underscored: true });

(async () => {
  await seq.authenticate();
  const [n] = await seq.query(
    `UPDATE assignments SET is_published = true WHERE type IN ('assessment','survey') AND is_published = false RETURNING title`,
  );
  if (n.length === 0) {
    console.log('Nothing to publish — all assessment/survey rows already published.');
  } else {
    console.log(`Published ${n.length} assignment(s):`);
    n.forEach((r) => console.log(' -', r.title));
  }
  await seq.close();
})().catch((e) => { console.error(e); process.exit(1); });
