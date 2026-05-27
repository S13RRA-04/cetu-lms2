'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

function buildUri() {
  let uri = process.env.MONGO_URI ?? '';
  const user = process.env.MONGO_USERNAME;
  const pass = process.env.MONGO_PASSWORD;
  if (user && pass) {
    uri = uri.replace('<password>', encodeURIComponent(pass))
             .replace('{MONGO_PASSWORD}', encodeURIComponent(pass))
             .replace('<username>', encodeURIComponent(user))
             .replace('{MONGO_USERNAME}', encodeURIComponent(user));
    if (!uri.includes('@'))
      uri = uri.replace(/^(mongodb(?:\+srv)?:\/\/)/, `$1${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`);
  }
  return uri;
}

async function main() {
  const client = new MongoClient(buildUri());
  await client.connect();
  const db = client.db(process.env.MONGO_DB_NAME);

  // 1. All distinct content types
  const types = await db.collection('pactContent').distinct('type');
  console.log('\n=== Distinct content types in pactContent ===');
  console.log(types);

  // 2. All content IDs + type + title (summary view)
  console.log('\n=== All pactContent items (id, type, title) ===');
  const all = await db.collection('pactContent').find({}, { projection: { id: 1, type: 1, title: 1, cohortId: 1 } }).toArray();
  for (const doc of all) {
    console.log(`  ${doc.type?.padEnd(16)} | ${doc.id?.padEnd(36)} | cohort: ${doc.cohortId ?? 'null'} | ${doc.title ?? '(no title)'}`);
  }

  // 3. Full docs for anything that is NOT type "module"
  console.log('\n=== Non-module content (full docs) ===');
  const nonModule = await db.collection('pactContent').find({ type: { $ne: 'module' } }).toArray();
  for (const doc of nonModule) {
    console.log(JSON.stringify(doc, null, 2));
  }

  // 4. Survey definition — the post-course-survey item from pactContent (if it exists)
  console.log('\n=== Survey content items ===');
  const surveys = await db.collection('pactContent').find({ id: /survey/i }).toArray();
  for (const doc of surveys) {
    console.log(JSON.stringify(doc, null, 2));
  }

  // 5. Check staging collection for any assessment types
  console.log('\n=== pact_staging_pactContent distinct types ===');
  const stagingTypes = await db.collection('pact_staging_pactContent').distinct('type');
  console.log(stagingTypes);

  await client.close();
}

main().catch(err => { console.error(err.message); process.exit(1); });
