'use strict';
/**
 * One-time setup for PACKET HEIST v2 — Drop 4 ("The Case").
 * See setup-packet-heist-v2-drop1.js for the full pattern this follows.
 *
 * Cohort-wide (seizure returns, office/residence forensic extractions,
 * Sam Smith's phone records, the held-back CoinBridge KYC return) — flat
 * under Drop 4/. No location gating: unlike the old Drop 6, this manifest
 * treats office + residence extractions as one unified drop every squad
 * analyzes together (see the plan's finding #6).
 *
 * Run: node backend/scripts/setup-packet-heist-v2-drop4.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getLiveSequelize } = require('./lib/liveDb');
const { uploadFlattened } = require('./lib/uploadDropFolder');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 4;
const SCENARIO = 'packet-heist-v2';
const DROP_TITLE = 'PACKET HEIST v2 \u2014 Drop 4: "The Case"';
const R2_DROP_PREFIX = 'scenarios/PACKET HEIST V2/Drop 4/';

const LOCAL_DROP_ROOT = 'C:\\Users\\CETUAdmin1\\Documents\\Projects\\PROFESSIONAL\\PACT v5\\Drops\\v2\\Drop 4';

const NARRATIVE_INTRO = `Yesterday's search has been processed. Today's drop is what came off the scene: forensic extractions from the seized devices, copies of the physical items collected, and the exchange return that was outstanding. Today the squad brings the case together — attribution to a named subject, the money trail, and the charging picture — and completes the victim-notification obligation identified during the operation.

Attribution is an analytic product. Reach it from the evidence, assign a confidence level, and state exactly which artifacts carry it. Reconcile custody first: confirm every item in the seized-evidence inventory against your on-scene forms and flag any gap before you build on that item.

The search identified a client with a live, unused access that has not been sold or exploited. This is a preventable harm — treat notification of that victim as a priority action today, coordinated through the command post, not an afterthought.`;

async function uploadEvidence() {
  const uploaded = await uploadFlattened(LOCAL_DROP_ROOT, R2_DROP_PREFIX);
  console.log(`Uploaded ${uploaded.length} files:`, uploaded);
}

async function syncAndTagContentItems(seq) {
  const { syncDropCaseFiles } = require('../src/services/courseContent.service');
  const result = await syncDropCaseFiles(COURSE_ID, { scenarioName: SCENARIO, dropNumber: DROP });
  console.log('syncDropCaseFiles result:', result);

  const [rows] = await seq.query(
    `UPDATE course_content_items
       SET drop_number = :drop, scenario_name = :scenario
     WHERE course_id = :courseId AND source_drop_number = :drop AND scenario_name = :scenario
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
  if (existing.length > 0) { console.log('ScenarioPackage already exists for Drop 4'); return; }

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
        title: 'Drop 4 \u2014 Seizure Returns and Forensic Extractions',
        description: 'Seized-evidence inventory, physical-item copies, office and residence forensic extractions, Sam Smith\u2019s phone records, and the held-back CoinBridge KYC return.',
        fileName: 'Drop 4 Packet', r2Key: r2Key, releaseNumber: Number(next), drop: DROP,
      },
      transaction,
    },
  );
  console.log('Created ScenarioPackage for Drop 4');
}

async function createCampaignDrop(seq, transaction) {
  const [existing] = await seq.query(
    `SELECT id FROM campaign_drops WHERE course_id = :courseId AND number = :drop AND scenario_name = :scenario`,
    { replacements: { courseId: COURSE_ID, drop: DROP, scenario: SCENARIO }, transaction },
  );
  if (existing.length > 0) {
    console.log(`CampaignDrop ${DROP} (${SCENARIO}) already exists (id ${existing[0].id})`);
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
  console.log(`Created CampaignDrop ${DROP} (${SCENARIO}) (id ${dropId})`);
  return dropId;
}

async function createVaultPuzzle(seq, transaction, dropId) {
  const [existing] = await seq.query(
    `SELECT id FROM campaign_drop_puzzles WHERE drop_id = :dropId AND puzzle_type = 'vault_lock'`,
    { replacements: { dropId }, transaction },
  );
  if (existing.length > 0) { console.log('vault_lock puzzle already exists'); return; }

  const secret = 'ATTRIBUTION PROCEEDS AND CASE ASSEMBLY';
  const answer = crypto.createHash('sha256').update(secret).digest('hex');
  const prompt = 'Today\'s Command Post transmission subject line, in full capitals, decrypts the drop: "______, ______, and ______ ______."';

  await seq.query(
    `INSERT INTO campaign_drop_puzzles
       (id, drop_id, puzzle_type, order_index, enabled, prompt, answer, config, created_at, updated_at)
     VALUES (:id, :dropId, 'vault_lock', 0, true, :prompt, :answer, '{}', NOW(), NOW())`,
    { replacements: { id: uuidv4(), dropId, prompt, answer }, transaction },
  );
  console.log('Created vault_lock puzzle');
}

async function main() {
  const seq = getLiveSequelize();
  try {
    await seq.authenticate();

    await uploadEvidence();
    await syncAndTagContentItems(seq);

    await seq.transaction(async (transaction) => {
      await createScenarioPackage(seq, transaction);
      const dropId = await createCampaignDrop(seq, transaction);
      await createVaultPuzzle(seq, transaction, dropId);
    });

    console.log('Drop 4 (packet-heist-v2) setup complete (all draft/unpublished \u2014 release explicitly via the admin UI).');
    process.exit(0);
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { main };
