'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { MongoClient }  = require('mongodb');
const { sequelize }    = require('../src/config/database');
const ModuleModel      = require('../src/models/Module')(sequelize);
const AssignmentModel  = require('../src/models/Assignment')(sequelize);

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

const MONGO_URI = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cetu.jiwe0mt.mongodb.net/?appName=CETU`;

// ── Day containers ────────────────────────────────────────────────────────────
const DAY_MODULES = [
  { key: 'day_1',    title: 'Day 1: Threat Landscape & Legal Framework',             order_index: 0 },
  { key: 'day_2',    title: 'Day 2: Evidence Identification & International Acquisition', order_index: 1 },
  { key: 'day_3',    title: 'Day 3: Forensics & Timeline Construction',               order_index: 2 },
  { key: 'day_4',    title: 'Day 4: Attribution & Investigator\'s Toolbox',           order_index: 3 },
  { key: 'day_5',    title: 'Day 5: Capstone & Disposition',                          order_index: 4 },
  { key: 'assess',   title: 'Assessments',                                            order_index: 5 },
  { key: 'scenario', title: 'Scenario: Operation BROKERED EXIT',                      order_index: 6 },
];

// ── Map old Mongo id → assignment fields ──────────────────────────────────────
// order_index is course-wide sequential ordering
const ASSIGNMENT_MAP = {
  'module-day1-lecture1':              { type: 'module',     grading_mode: 'individual', order_index: 0  },
  'module-day1-lecture2':              { type: 'module',     grading_mode: 'individual', order_index: 1  },
  'day1-am-workshop':                  { type: 'module',     grading_mode: 'squad',      order_index: 2  },
  'workshop:day1-pm-squad-1-anyproxy': { type: 'module',     grading_mode: 'squad',      order_index: 3  },
  'workshop:day1-pm-squad-2-qakbot':   { type: 'module',     grading_mode: 'squad',      order_index: 4  },
  'workshop:day1-pm-squad-3-irgc':     { type: 'module',     grading_mode: 'squad',      order_index: 5  },
  'workshop:day1-pm-squad-4-hafnium':  { type: 'module',     grading_mode: 'squad',      order_index: 6  },
  'cap-d1-end-daily-synthesis':        { type: 'capstone',   grading_mode: 'squad',      order_index: 7  },

  'module-day2-lecture1':                    { type: 'module',   grading_mode: 'individual', order_index: 8  },
  'module-day2-lecture2':                    { type: 'module',   grading_mode: 'individual', order_index: 9  },
  'workshop:day2-am-brokered-exit-synthesis':{ type: 'module',   grading_mode: 'squad',      order_index: 10 },
  'cap-r4-analysis-brokered-exit':           { type: 'capstone', grading_mode: 'squad',      order_index: 11 },

  'module-day3-lecture1':       { type: 'module',   grading_mode: 'individual', order_index: 12 },
  'day3-am-workshop':           { type: 'challenge', grading_mode: 'squad',     order_index: 13 },
  'cap-d3-end-daily-synthesis': { type: 'capstone',  grading_mode: 'squad',     order_index: 14 },

  'module-day4-lecture1':       { type: 'module',    grading_mode: 'individual', order_index: 15 },
  'module-day4-lecture2':       { type: 'module',    grading_mode: 'individual', order_index: 16 },
  'day4-am-workshop':           { type: 'challenge', grading_mode: 'squad',      order_index: 17 },
  'day4-pm-workshop':           { type: 'challenge', grading_mode: 'squad',      order_index: 18 },
  'cap-d4-end-daily-synthesis': { type: 'capstone',  grading_mode: 'squad',      order_index: 19 },

  'module-day5-capstone':             { type: 'module',   grading_mode: 'individual', order_index: 20 },
  'cap-d5-brokered-exit-disposition': { type: 'capstone', grading_mode: 'squad',      order_index: 21 },

  'assessment-pretest':  { type: 'assessment', grading_mode: 'individual', order_index: 22 },
  'assessment-posttest': { type: 'assessment', grading_mode: 'individual', order_index: 23 },
  'post-course-survey':  { type: 'survey',     grading_mode: 'individual', order_index: 24 },

  'scenario-brokered-exit': { type: 'challenge', grading_mode: 'squad', order_index: 25 },
};

async function run() {
  // ── Mongo ──────────────────────────────────────────────────────────────────
  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();
  const docs = await mongo.db(process.env.MONGO_DB_NAME).collection('pactContent').find({}).toArray();
  await mongo.close();
  console.log(`Fetched ${docs.length} docs from MongoDB`);

  // ── Postgres ───────────────────────────────────────────────────────────────
  await sequelize.authenticate();
  console.log('PostgreSQL connected');

  // Guard: don't run twice
  const existing = await AssignmentModel.count({ where: { course_id: COURSE_ID } });
  if (existing > 0) {
    console.warn(`⚠  ${existing} assignments already exist for this course — aborting to avoid duplicates.`);
    console.warn('   Drop them first if you want to re-run: DELETE FROM assignments WHERE course_id = \'<id>\';');
    process.exit(1);
  }

  // ── Create day-container modules ───────────────────────────────────────────
  const moduleMap = {};
  for (const m of DAY_MODULES) {
    const rec = await ModuleModel.create({
      course_id:    COURSE_ID,
      title:        m.title,
      order_index:  m.order_index,
      is_published: true,
    });
    moduleMap[m.key] = rec.id;
    console.log(`  Module [${m.key}] → ${rec.id}  "${m.title}"`);
  }

  // ── Create assignments ─────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;
  for (const doc of docs) {
    const mapping = ASSIGNMENT_MAP[doc.id];
    if (!mapping) {
      console.warn(`  SKIP  ${doc.id}  (no mapping defined)`);
      skipped++;
      continue;
    }

    const maxScore = (doc.maxScore && doc.maxScore > 0) ? doc.maxScore : 100;

    await AssignmentModel.create({
      course_id:    COURSE_ID,
      title:        doc.title,
      description:  doc.prompt ?? null,
      max_score:    maxScore,
      is_published: true,
      type:         mapping.type,
      grading_mode: mapping.grading_mode,
      order_index:  mapping.order_index,
    });

    console.log(`  ✓  [${String(mapping.order_index).padStart(2)}] ${mapping.type.padEnd(10)} ${mapping.grading_mode.padEnd(10)} "${doc.title}"`);
    created++;
  }

  console.log(`\nDone. ${created} assignments created, ${skipped} skipped.`);
  await sequelize.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
