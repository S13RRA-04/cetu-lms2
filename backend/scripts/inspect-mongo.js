'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

function buildUri() {
  let uri = process.env.MONGO_URI ?? '';
  const user = process.env.MONGO_USERNAME;
  const pass = process.env.MONGO_PASSWORD;

  // If the URI has a placeholder or is missing credentials, inject them
  if (user && pass) {
    // Replace angle-bracket and curly-brace placeholders
    uri = uri.replace('<password>', encodeURIComponent(pass));
    uri = uri.replace('{MONGO_PASSWORD}', encodeURIComponent(pass));
    uri = uri.replace('<username>', encodeURIComponent(user));
    uri = uri.replace('{MONGO_USERNAME}', encodeURIComponent(user));

    // If URI has no userinfo at all (mongodb+srv://hostname/...) inject it
    if (!uri.includes('@')) {
      uri = uri.replace(/^(mongodb(?:\+srv)?:\/\/)/, `$1${encodeURIComponent(user)}:${encodeURIComponent(pass)}@`);
    }
  }

  console.log('Connecting with URI pattern:', uri.replace(/:[^:@]+@/, ':***@'));
  return uri;
}

async function main() {
  const uri = buildUri();
  if (!uri) { console.error('MONGO_URI not set'); process.exit(1); }

  const client = new MongoClient(uri);
  await client.connect();

  const dbName = process.env.MONGO_DB_NAME;
  const db = dbName ? client.db(dbName) : client.db();

  console.log('\n=== DATABASE:', db.databaseName, '===\n');

  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name).join(', '), '\n');

  for (const col of collections) {
    const coll = db.collection(col.name);
    const count = await coll.countDocuments();
    console.log(`\n--- ${col.name} (${count} docs) ---`);
    const samples = await coll.find({}).limit(2).toArray();
    for (const doc of samples) {
      console.log(JSON.stringify(doc, null, 2));
    }
  }

  await client.close();
}

main().catch(err => { console.error(err.message); process.exit(1); });
