'use strict';
/**
 * One-time setup for PACKET HEIST — Drop 6 (RestonIT office + Alex Reston
 * residence search warrants).
 *
 * 1. Uploads the rendered evidence PDFs (see scripts/render-drop6-evidence.py)
 *    to R2 under scenarios/PACKET HEIST/Drop 6/<source folder>/<file>.pdf
 * 2. Syncs them into course_content_items via the existing syncDropCaseFiles
 *    pipeline, then tags the new rows with drop_number/scenario_name so they
 *    pair with the Drop 6 CampaignDrop for release (matching the convention
 *    documented in campaign.service.js's pairedMaterialWhere()).
 * 3. Creates one ScenarioPackage per source folder (whole-folder download,
 *    matching the Drop 1 per-victim-folder pattern) — left unpublished.
 * 4. Creates the campaign_drops row for Drop 6 and one enabled vault_lock
 *    puzzle (required transmission gate before the drop can be released).
 *
 * Idempotent: safe to re-run. Does not publish or unlock anything for any
 * cohort — that is a separate, explicit "Release" action in the admin UI.
 *
 * Run: node backend/scripts/setup-packet-heist-drop6.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Sequelize } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET } = require('../src/config/r2');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 6;
const SCENARIO = 'packet-heist';
const DROP_TITLE = 'PACKET HEIST - Drop 6';
const R2_DROP_PREFIX = 'scenarios/PACKET HEIST/Drop 6/';

const LOCAL_PDF_ROOT = 'C:\\Users\\CETUAdmin1\\Documents\\Projects\\PROFESSIONAL\\PACT v5\\Drops\\6 - SWs\\PDFs';

const SOURCE_FOLDERS = [
  { dir: 'RestonIT Office - Reston', title: 'Drop 6 — RestonIT Office (Reston Desk)' },
  { dir: 'RestonIT Office - Sam Smith', title: 'Drop 6 — RestonIT Office (Sam Smith Desk)' },
  { dir: 'Alex Reston Residence', title: 'Drop 6 — Alex Reston Residence' },
];

const NARRATIVE_INTRO = `Search warrants have been executed at RestonIT LLC's office (Dogwood Enterprises Office Suites, Suite 214) and at Alex Reston's personal residence, based on the probable cause developed in Drop 5.

The office search is scoped to establish RestonIT's credential custody, exported access records, and business nexus to the four victim accounts. Sam Smith's workstation was also seized as a comparison device — do not assume every RestonIT employee is implicated; distinguish routine support activity from Alex's activity specifically.

The residence search is scoped to establish Alex Reston's personal possession of exported access data, his nexus to the BRKR_AL persona and Black Harbor Exchange, cryptocurrency/proceeds evidence, and any travel or foreign-contact indicators — separate from RestonIT's business operations.

Squads must synthesize office and residence evidence together, distinguish what each location proves from what it does not, and produce a defensible case disposition.`;

async function uploadEvidence(seq) {
  let uploaded = 0;
  for (const { dir } of SOURCE_FOLDERS) {
    const localDir = path.join(LOCAL_PDF_ROOT, dir);
    if (!fs.existsSync(localDir)) {
      console.warn(`Missing local folder, skipping: ${localDir}`);
      continue;
    }
    const files = fs.readdirSync(localDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
    for (const file of files) {
      const body = fs.readFileSync(path.join(localDir, file));
      const key = `${R2_DROP_PREFIX}${dir}/${file}`;
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: key, Body: body, ContentType: 'application/pdf',
      }));
      uploaded += 1;
    }
    console.log(`Uploaded ${files.length} files from "${dir}"`);
  }
  console.log(`Total uploaded: ${uploaded}`);
}

async function syncAndTagContentItems(seq) {
  const { syncDropCaseFiles } = require('../src/services/courseContent.service');
  const result = await syncDropCaseFiles(COURSE_ID, { scenarioName: SCENARIO, dropNumber: DROP });
  console.log('syncDropCaseFiles result:', result);

  const [rows] = await seq.query(
    `UPDATE course_content_items
       SET drop_number = :drop, scenario_name = :scenario
     WHERE course_id = :courseId AND source_drop_number = :drop
     RETURNING id`,
    { replacements: { courseId: COURSE_ID, drop: DROP, scenario: SCENARIO } },
  );
  console.log(`Tagged ${rows.length} course_content_items rows with drop_number=${DROP}, scenario_name='${SCENARIO}'`);
}

async function createScenarioPackages(seq, transaction) {
  for (const { dir, title } of SOURCE_FOLDERS) {
    const r2Key = `${R2_DROP_PREFIX}${dir}/`;
    const [existing] = await seq.query(
      `SELECT id FROM scenario_packages WHERE course_id = :courseId AND r2_key = :r2Key`,
      { replacements: { courseId: COURSE_ID, r2Key }, transaction },
    );
    if (existing.length > 0) { console.log(`ScenarioPackage already exists for ${dir}`); continue; }

    const [[{ next }]] = await seq.query(
      `SELECT COALESCE(MAX(release_number), 0) + 1 AS next FROM scenario_packages WHERE course_id = :courseId`,
      { replacements: { courseId: COURSE_ID }, transaction },
    );
    await seq.query(
      `INSERT INTO scenario_packages
         (id, course_id, scenario_name, title, description, file_name, r2_key,
          release_number, drop_number, is_published, created_at, updated_at)
       VALUES (:id, :courseId, :scenario, :title, :description, :fileName, :r2Key,
          :releaseNumber, :drop, false, NOW(), NOW())`,
      {
        replacements: {
          id: uuidv4(), courseId: COURSE_ID, scenario: SCENARIO, title,
          description: `Drop 6 search warrant evidence — ${dir}`,
          fileName: dir, r2Key: r2Key, releaseNumber: Number(next), drop: DROP,
        },
        transaction,
      },
    );
    console.log(`Created ScenarioPackage for ${dir}`);
  }
}

async function createCampaignDrop(seq, transaction) {
  const [existing] = await seq.query(
    `SELECT id FROM campaign_drops WHERE course_id = :courseId AND number = :drop`,
    { replacements: { courseId: COURSE_ID, drop: DROP }, transaction },
  );
  if (existing.length > 0) {
    console.log(`CampaignDrop ${DROP} already exists (id ${existing[0].id})`);
    return existing[0].id;
  }

  const dropId = uuidv4();
  await seq.query(
    `INSERT INTO campaign_drops
       (id, course_id, number, title, scenario_name, narrative_intro,
        vault_enabled, signal_enabled, created_at, updated_at)
     VALUES (:id, :courseId, :drop, :title, :scenario, :narrative,
        false, false, NOW(), NOW())`,
    {
      replacements: {
        id: dropId, courseId: COURSE_ID, drop: DROP, title: DROP_TITLE,
        scenario: SCENARIO, narrative: NARRATIVE_INTRO,
      },
      transaction,
    },
  );
  console.log(`Created CampaignDrop ${DROP} (id ${dropId})`);
  return dropId;
}

async function createVaultPuzzle(seq, transaction, dropId) {
  const [existing] = await seq.query(
    `SELECT id FROM campaign_drop_puzzles WHERE drop_id = :dropId AND puzzle_type = 'vault_lock'`,
    { replacements: { dropId }, transaction },
  );
  if (existing.length > 0) { console.log('vault_lock puzzle already exists'); return; }

  const secret = 'SUITE 214';
  const answer = crypto.createHash('sha256').update(secret).digest('hex');
  const prompt = 'Use the FBI CART standard technique for generating a \'digital fingerprint\' of the RestonIT office search location (as written on the warrant, all caps, one space) to obtain the decryption key.';

  await seq.query(
    `INSERT INTO campaign_drop_puzzles
       (id, drop_id, puzzle_type, order_index, enabled, prompt, answer, config, created_at, updated_at)
     VALUES (:id, :dropId, 'vault_lock', 0, true, :prompt, :answer, '{}', NOW(), NOW())`,
    { replacements: { id: uuidv4(), dropId, prompt, answer }, transaction },
  );
  console.log('Created vault_lock puzzle');
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const seq = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
  });
  try {
    await seq.authenticate();

    await uploadEvidence(seq);
    await syncAndTagContentItems(seq);

    await seq.transaction(async (transaction) => {
      await createScenarioPackages(seq, transaction);
      const dropId = await createCampaignDrop(seq, transaction);
      await createVaultPuzzle(seq, transaction, dropId);
    });

    console.log('Drop 6 setup complete (all draft/unpublished — release explicitly via the admin UI).');
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
