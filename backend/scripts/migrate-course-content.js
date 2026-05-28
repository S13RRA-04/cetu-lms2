'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

(async () => {
  await seq.authenticate();
  console.log('Connected.');

  await seq.query(`
    CREATE TABLE IF NOT EXISTS course_content_items (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id     UUID        NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title         VARCHAR(255) NOT NULL,
      description   TEXT,
      content_type  VARCHAR(20) NOT NULL DEFAULT 'resource'
                    CHECK (content_type IN ('slides','handout','agenda','form','resource')),
      url           TEXT,
      r2_key        VARCHAR(512),
      file_name     VARCHAR(255),
      file_size     BIGINT,
      order_index   INTEGER     NOT NULL DEFAULT 0,
      is_published  BOOLEAN     NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ course_content_items');

  await seq.query(`
    CREATE TABLE IF NOT EXISTS course_content_unlocks (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id   UUID        NOT NULL REFERENCES course_content_items(id) ON DELETE CASCADE,
      cohort_id    UUID        NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
      unlocked_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
      unlocked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ course_content_unlocks');

  await seq.close();
  console.log('Done.');
})().catch((e) => { console.error(e); process.exit(1); });
