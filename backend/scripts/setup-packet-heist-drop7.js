'use strict';
/**
 * One-time setup for PACKET HEIST — Drop 7 (financial/cryptocurrency legal
 * process tying Alex Reston and Mikhail Rogov / BRKR_RU to a conspiracy to
 * sell compromised access).
 *
 * Source docs: PACT v5 project, Drops/7/*.md, rendered to PDF by
 * scripts/render-drop-markdown.py.
 *
 * 1. Uploads the rendered packet PDFs to R2 under
 *    scenarios/PACKET HEIST/Drop 7/<file>.pdf (flat — cohort-wide documents,
 *    not per-victim/source, matching the Drop 2/3/4/5 pattern).
 * 2. Syncs them into course_content_items via syncDropCaseFiles, then tags
 *    the new rows with drop_number/scenario_name so they pair with the
 *    Drop 7 CampaignDrop for release.
 * 3. Creates one ScenarioPackage for the whole Drop 7 folder — unpublished.
 * 4. Creates the campaign_drops row for Drop 7 and one enabled vault_lock
 *    puzzle (required transmission gate before the drop can be released).
 *
 * Idempotent: safe to re-run. Does not publish or unlock anything for any
 * cohort — that is a separate, explicit "Release" action in the admin UI.
 *
 * Run: node backend/scripts/setup-packet-heist-drop7.js
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
const DROP = 7;
const SCENARIO = 'packet-heist';
const DROP_TITLE = 'PACKET HEIST - Drop 7';
const R2_DROP_PREFIX = 'scenarios/PACKET HEIST/Drop 7/';

const LOCAL_PDF_ROOT = 'C:\\Users\\CETUAdmin1\\Documents\\Projects\\PROFESSIONAL\\PACT v5\\Drops\\7\\PDFs';

const NARRATIVE_INTRO = `Financial and blockchain legal process has returned. A private-sector chain-analysis engagement traced the Black Harbor Exchange escrow wallet used in the four victim access sales, a foreign exchange KYC/subpoena return identified the account receiving a consistent revenue-share of the proceeds, and a foreign-partner financial intelligence return corroborates the account holder's identity: Mikhail Rogov, a Russian national.

This packet answers the open question from the Drop 6 office search — a handwritten note reading "RU takes cut?" — with financial evidence rather than speculation. It does not, by itself, prove that Rogov is personally the operator of the BRKR_RU forum persona; that distinction matters and squads must preserve it.

Squads must synthesize the chain-analysis report, exchange return, foreign-partner return, and escrow correlation memo, then complete the Conspiracy Elements Assessment Worksheet to determine whether — and how — the evidence supports a conspiracy theory tying Alex Reston and Mikhail Rogov together.`;

async function uploadEvidence() {
  if (!fs.existsSync(LOCAL_PDF_ROOT)) throw new Error(`Missing local PDF folder: ${LOCAL_PDF_ROOT}`);
  const files = fs.readdirSync(LOCAL_PDF_ROOT).filter((f) => f.toLowerCase().endsWith('.pdf'));
  for (const file of files) {
    const body = fs.readFileSync(path.join(LOCAL_PDF_ROOT, file));
    const key = `${R2_DROP_PREFIX}${file}`;
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET, Key: key, Body: body, ContentType: 'application/pdf',
    }));
  }
  console.log(`Uploaded ${files.length} files to ${R2_DROP_PREFIX}`);
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

async function createScenarioPackage(seq, transaction) {
  const r2Key = R2_DROP_PREFIX;
  const [existing] = await seq.query(
    `SELECT id FROM scenario_packages WHERE course_id = :courseId AND r2_key = :r2Key`,
    { replacements: { courseId: COURSE_ID, r2Key }, transaction },
  );
  if (existing.length > 0) { console.log('ScenarioPackage already exists for Drop 7'); return; }

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
        id: uuidv4(), courseId: COURSE_ID, scenario: SCENARIO,
        title: 'Drop 7 — Financial & Cryptocurrency Legal Process Packet',
        description: 'Chain analysis, exchange KYC/subpoena return, foreign-partner return, and conspiracy assessment worksheet tying Alex Reston and Mikhail Rogov to the BHX escrow proceeds.',
        fileName: 'Drop 7 Packet', r2Key: r2Key, releaseNumber: Number(next), drop: DROP,
      },
      transaction,
    },
  );
  console.log('Created ScenarioPackage for Drop 7');
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

  const secret = 'MIKHAIL ROGOV';
  const answer = crypto.createHash('sha256').update(secret).digest('hex');
  const prompt = 'Use the FBI CART standard technique for generating a \'digital fingerprint\' of the Vertex Digital Assets account holder\'s first and last name only (omit the patronymic/middle name; all caps, one space between the two names) to obtain the decryption key.';

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

    await uploadEvidence();
    await syncAndTagContentItems(seq);

    await seq.transaction(async (transaction) => {
      await createScenarioPackage(seq, transaction);
      const dropId = await createCampaignDrop(seq, transaction);
      await createVaultPuzzle(seq, transaction, dropId);
    });

    console.log('Drop 7 setup complete (all draft/unpublished — release explicitly via the admin UI).');
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
