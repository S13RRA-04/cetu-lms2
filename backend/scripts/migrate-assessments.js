'use strict';
/**
 * One-time migration: pull assessment-pretest, assessment-posttest, and
 * post-course-survey from MongoDB (pactContent) and insert them as
 * Assignment rows in PostgreSQL.
 *
 * Safe to re-run — skips any item whose lti_resource_link_id already exists.
 *
 * Usage: node scripts/migrate-assessments.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { MongoClient }  = require('mongodb');
const { Sequelize, DataTypes } = require('sequelize');

const COURSE_ID = process.env.PACT_COURSE_ID ?? 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const MONGO_IDS = ['assessment-pretest', 'assessment-posttest', 'post-course-survey'];

/* ── MongoDB ── */
function buildMongoUri() {
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

/* ── Postgres (minimal inline model) ── */
function buildSequelize() {
  const url = process.env.DATABASE_URL;
  if (url) {
    return new Sequelize(url, {
      dialect: 'postgres',
      dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
      logging: false,
    });
  }
  return new Sequelize(
    process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,
    { host: process.env.DB_HOST, port: process.env.DB_PORT ?? 5432, dialect: 'postgres', logging: false }
  );
}

/* Map a MongoDB pactContent doc to an Assignment row */
function toAssignmentRow(doc) {
  let pgType, questions, maxScore, description, orderIndex;

  if (doc.id === 'post-course-survey') {
    pgType       = 'survey';
    questions    = doc.mechanics?.surveyQuestions ?? [];
    maxScore     = 0;
    description  = doc.mechanics?.prompt ?? 'Your feedback helps improve future PACT cohorts.';
    orderIndex   = 902;
  } else {
    pgType       = 'assessment';
    questions    = doc.questions ?? [];
    maxScore     = doc.maxScore ?? 0;
    description  = doc.prompt ?? '';
    orderIndex   = doc.id === 'assessment-pretest' ? 900 : 901;
  }

  return {
    course_id:            COURSE_ID,
    title:                doc.title ?? doc.lmsLabel ?? doc.id,
    description,
    max_score:            maxScore,
    is_published:         false,          // admin must publish + unlock per cohort
    type:                 pgType,
    grading_mode:         'individual',
    order_index:          orderIndex,
    questions,
    lti_resource_link_id: doc.id,         // store legacy mongo id for idempotency
  };
}

async function main() {
  /* ── Connect Mongo ── */
  const mongoClient = new MongoClient(buildMongoUri());
  await mongoClient.connect();
  const db = mongoClient.db(process.env.MONGO_DB_NAME);
  const mongoDocs = await db.collection('pactContent')
    .find({ id: { $in: MONGO_IDS } })
    .toArray();
  await mongoClient.close();

  if (!mongoDocs.length) {
    console.error('No matching documents found in MongoDB. Check MONGO_IDS or collection name.');
    process.exit(1);
  }

  console.log(`Found ${mongoDocs.length} MongoDB docs: ${mongoDocs.map(d => d.id).join(', ')}`);

  /* ── Connect Postgres ── */
  const sequelize = buildSequelize();

  const Assignment = sequelize.define('Assignment', {
    id:                   { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    course_id:            DataTypes.UUID,
    title:                DataTypes.STRING(255),
    description:          DataTypes.TEXT,
    max_score:            DataTypes.DECIMAL(8, 2),
    is_published:         DataTypes.BOOLEAN,
    type:                 DataTypes.STRING,
    grading_mode:         DataTypes.STRING,
    order_index:          DataTypes.INTEGER,
    questions:            DataTypes.JSONB,
    lti_resource_link_id: DataTypes.STRING(255),
  }, { tableName: 'assignments', underscored: true });

  await sequelize.authenticate();

  let inserted = 0, skipped = 0;

  for (const doc of mongoDocs) {
    const existing = await Assignment.findOne({
      where: { lti_resource_link_id: doc.id },
    });
    if (existing) {
      console.log(`  SKIP  ${doc.id} — already exists (id: ${existing.id})`);
      skipped++;
      continue;
    }

    const row = toAssignmentRow(doc);
    const created = await Assignment.create(row);
    console.log(`  INSERT ${doc.id} → PG id: ${created.id} (type: ${row.type}, questions: ${row.questions.length})`);
    inserted++;
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
  await sequelize.close();
}

main().catch(err => { console.error(err.message); process.exit(1); });
