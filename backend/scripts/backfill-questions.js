'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { MongoClient }    = require('mongodb');
const { sequelize }      = require('../src/config/database');
const AssignmentModel    = require('../src/models/Assignment')(sequelize);

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const MONGO_URI = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cetu.jiwe0mt.mongodb.net/?appName=CETU`;

async function run() {
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const docs = await mongo.db(process.env.MONGO_DB_NAME).collection('pactContent').find({}).toArray();
  await mongo.close();
  console.log(`Fetched ${docs.length} MongoDB docs`);

  await sequelize.authenticate();

  let updated = 0;
  for (const doc of docs) {
    if (!doc.questions?.length) continue;
    const [rows] = await sequelize.query(
      `UPDATE assignments SET questions = :q WHERE course_id = :c AND title = :t RETURNING id`,
      { replacements: { q: JSON.stringify(doc.questions), c: COURSE_ID, t: doc.title } },
    );
    if (rows.length) {
      console.log(`  ✓  "${doc.title}" → ${rows[0].id}  (${doc.questions.length} questions)`);
      updated++;
    } else {
      console.warn(`  ✗  no assignment found for title "${doc.title}"`);
    }
  }

  console.log(`\nDone. ${updated} assignments updated.`);
  await sequelize.close();
}

run().catch((err) => { console.error(err); process.exit(1); });
