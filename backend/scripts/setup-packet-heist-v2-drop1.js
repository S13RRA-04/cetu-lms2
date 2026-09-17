'use strict';
/**
 * One-time setup for PACKET HEIST v2 — Drop 1 ("The Victims").
 *
 * This is the rebuilt PACT scenario (September 21-25, 2026 cohort) — it
 * supersedes the old 'packet-heist' (7-drop) and 'brokered-exit' content for
 * *new* cohorts, but runs under a distinct scenario_name so old cohorts'
 * history is untouched (campaign.service.js's pairedMaterialWhere() scopes
 * strictly on {course_id, drop_number, scenario_name}).
 *
 * Source docs: PACT v5 project, Drops/v2/Drop 1/<Victim>/*, already
 * fully-authored (real PDF/CSV/TXT/EML/JSON files, not source markdown).
 *
 * 1. Uploads each victim's evidence files to R2 under
 *    scenarios/PACKET HEIST V2/Drop 1/<Victim>/<file>, flattened one level
 *    regardless of source nesting depth (see scripts/lib/uploadDropFolder.js).
 * 2. Syncs them into course_content_items via syncDropCaseFiles, then tags
 *    the new rows with drop_number/scenario_name so they pair with the
 *    Drop 1 CampaignDrop for release.
 * 3. Creates one ScenarioPackage per victim folder — unpublished.
 * 4. Creates the campaign_drops row for Drop 1 and one enabled vault_lock
 *    puzzle (required transmission gate before the drop can be released).
 *
 * Idempotent: safe to re-run. Does not publish or unlock anything for any
 * cohort — that is a separate, explicit "Release" action in the admin UI.
 *
 * Run: node backend/scripts/setup-packet-heist-v2-drop1.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getLiveSequelize } = require('./lib/liveDb');
const path = require('path');
const { uploadFlattened, uploadFile } = require('./lib/uploadDropFolder');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const DROP = 1;
const SCENARIO = 'packet-heist-v2';
const DROP_TITLE = 'PACKET HEIST v2 \u2014 Drop 1: "The Victims"';
const R2_DROP_PREFIX = 'scenarios/PACKET HEIST V2/Drop 1/';

const LOCAL_DROP_ROOT = 'C:\\Users\\CETUAdmin1\\Documents\\Projects\\PROFESSIONAL\\PACT v5\\Drops\\v2\\Drop 1';

// Local folder name -> R2 victim subfolder name (also used as the ScenarioPackage title)
// -> victims.js code, for tagging the release-scoping victim_code column.
const VICTIMS = [
  { folder: 'CyberDyne', r2Name: 'CyberDyne', code: 'CYBERDYNE' },
  { folder: 'Dogwood', r2Name: 'Dogwood', code: 'DOGWOOD' },
  { folder: 'PixelPlay', r2Name: 'PixelPlay', code: 'PIXELPLAY' },
  { folder: 'Redstone Memorial Hospital', r2Name: 'Redstone Memorial Hospital', code: 'REDSTONE' },
];

const NARRATIVE_INTRO = `Your squad has been assigned four referred cyber complaints received by the field office over recent weeks. Each was reported separately by a different victim organization: CyberDyne Data Center (suspected theft of hosted client data), Pixel Play Arcade (ransomware), Dogwood Hotel (fraudulent wire transfers via business email compromise), and Redstone Memorial Hospital (a detected intrusion attempt).

At this stage these are four independent matters. No determination has been made regarding any relationship among them. Your task is to begin working them: understand what each victim's own records establish, and identify what you would need to obtain next.

Treat every file as what it is on its face: a record produced by that victim's own systems or staff. Establish provenance for each fact you rely on. Normal is a finding. Absence of expected activity is a finding — do not discard records because they look uneventful.`;

async function uploadEvidence() {
  await uploadFile(
    path.join(LOCAL_DROP_ROOT, '00_COMMAND_POST_Day1.pdf'),
    `${R2_DROP_PREFIX}00_COMMAND_POST_Day1.pdf`,
  );
  console.log('Uploaded 00_COMMAND_POST_Day1.pdf');
  for (const victim of VICTIMS) {
    const localDir = path.join(LOCAL_DROP_ROOT, victim.folder);
    const uploaded = await uploadFlattened(localDir, `${R2_DROP_PREFIX}${victim.r2Name}/`);
    console.log(`Uploaded ${uploaded.length} files for ${victim.r2Name}:`, uploaded);
  }
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

  // Release-time squad scoping reads victim_code (not source_victim_code,
  // which is provenance-only) - each squad only sees its assigned victim's
  // files once an admin sets Squad N's victim in the Admin UI. Without this,
  // every squad sees all four victims' evidence regardless of assignment.
  const [victimRows] = await seq.query(
    `UPDATE course_content_items
       SET victim_code = source_victim_code, updated_at = NOW()
     WHERE course_id = :courseId AND scenario_name = :scenario AND drop_number = :drop
       AND source_victim_code IS NOT NULL AND (victim_code IS NULL OR victim_code <> source_victim_code)
     RETURNING id`,
    { replacements: { courseId: COURSE_ID, drop: DROP, scenario: SCENARIO } },
  );
  console.log(`Set victim_code on ${victimRows.length} course_content_items rows`);
}

async function createScenarioPackages(seq, transaction) {
  for (const victim of VICTIMS) {
    const r2Key = `${R2_DROP_PREFIX}${victim.r2Name}/`;
    const [existing] = await seq.query(
      `SELECT id FROM scenario_packages WHERE course_id = :courseId AND r2_key = :r2Key`,
      { replacements: { courseId: COURSE_ID, r2Key }, transaction },
    );
    if (existing.length > 0) {
      await seq.query(
        `UPDATE scenario_packages SET victim_code = :code, updated_at = NOW() WHERE id = :id AND victim_code IS DISTINCT FROM :code`,
        { replacements: { id: existing[0].id, code: victim.code }, transaction },
      );
      console.log(`ScenarioPackage already exists for ${victim.r2Name} (victim_code=${victim.code} ensured)`);
      continue;
    }

    const [[{ next }]] = await seq.query(
      `SELECT COALESCE(MAX(release_number), 0) + 1 AS next FROM scenario_packages WHERE course_id = :courseId`,
      { replacements: { courseId: COURSE_ID }, transaction },
    );
    await seq.query(
      `INSERT INTO scenario_packages
         (id, course_id, scenario_name, title, description, file_name, r2_key,
          release_number, drop_number, victim_code, is_published, created_at, updated_at)
       VALUES (:id, :courseId, :scenario, :title, :description, :fileName, :r2Key,
          :releaseNumber, :drop, :code, false, NOW(), NOW())`,
      {
        replacements: {
          id: uuidv4(), courseId: COURSE_ID, scenario: SCENARIO,
          title: `Drop 1 \u2014 ${victim.r2Name} Intake Packet`,
          description: `${victim.r2Name}'s own intake, correspondence, logs, and business records as received.`,
          fileName: `${victim.r2Name} Packet`, r2Key: r2Key, releaseNumber: Number(next), drop: DROP, code: victim.code,
        },
        transaction,
      },
    );
    console.log(`Created ScenarioPackage for ${victim.r2Name}`);
  }
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

  const secret = 'FOUR REFERRED MATTERS';
  const answer = crypto.createHash('sha256').update(secret).digest('hex');
  const prompt = 'Today\'s Command Post transmission subject line, in full capitals, decrypts the drop: "Initial complaint triage \u2014 ______ ______ ______."';

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
      await createScenarioPackages(seq, transaction);
      const dropId = await createCampaignDrop(seq, transaction);
      await createVaultPuzzle(seq, transaction, dropId);
    });

    console.log('Drop 1 (packet-heist-v2) setup complete (all draft/unpublished \u2014 release explicitly via the admin UI).');
    process.exit(0);
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}

module.exports = { main };
