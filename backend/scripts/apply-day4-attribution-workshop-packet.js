'use strict';
/**
 * Gives the LIVE "Day 4 AM Workshop: Attribution Synthesis" its evidence.
 *
 * The workshop was transcribed from Attribution_Workshop_Squad_Packet.docx,
 * but only the questions made it in — the packet's public-record facts for
 * each of the five categories never did, so students were answering "what
 * aliases does the indictment name?" with nothing to read. This:
 *
 *   1. uploads the packet PDF to R2 at workshops/day4/ (same layout as the
 *      Day 1 workshop handouts) and registers it as a published handout
 *      linked to the workshop;
 *   2. replaces the workshop's launch_briefing with LAUNCH_BRIEFING from
 *      lib/day4AttributionWorkshopSpec.js, which now carries the evidence.
 *
 * Touches launch_briefing only — never questions. The seeder can't be
 * re-run: it refuses once submissions exist, and buildQuestions() mints new
 * question ids, which would orphan every submitted answer.
 *
 * Idempotent (handout upserted by r2_key). Dry run by default.
 * Run: node backend/scripts/apply-day4-attribution-workshop-packet.js <packet.pdf> [--apply]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getLiveSequelize } = require('./lib/liveDb');
const { uploadFile } = require('./lib/uploadDropFolder');
const { TITLE, EXISTING_ID, LAUNCH_BRIEFING } = require('./lib/day4AttributionWorkshopSpec');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';
const FILE_NAME = 'Attribution Workshop Squad Packet.pdf';
const R2_KEY = `workshops/day4/${FILE_NAME}`;
const PUBLIC_URL = `https://pact-storage.cetu.online/${R2_KEY}`;
const APPLY = process.argv.includes('--apply');

async function main() {
  const pdf = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!pdf || !fs.existsSync(pdf)) throw new Error('Pass the path to the squad packet PDF');

  const seq = getLiveSequelize();
  try {
    await seq.authenticate();
    const [[workshop]] = await seq.query(
      'SELECT id, title, length(launch_briefing) AS briefing_len FROM assignments WHERE id = :id AND course_id = :courseId',
      { replacements: { id: EXISTING_ID, courseId: COURSE_ID } },
    );
    if (workshop?.title !== TITLE) throw new Error(`Workshop ${EXISTING_ID} not found as "${TITLE}"`);
    const [handouts] = await seq.query(
      'SELECT id FROM course_content_items WHERE course_id = :courseId AND r2_key = :r2Key',
      { replacements: { courseId: COURSE_ID, r2Key: R2_KEY } },
    );

    console.log(`${TITLE}\n  launch_briefing ${workshop.briefing_len} -> ${LAUNCH_BRIEFING.length} chars`);
    console.log(`  handout ${R2_KEY}: ${handouts.length ? `update ${handouts[0].id}` : 'insert'} (${fs.statSync(pdf).size} bytes)`);
    if (!APPLY) { console.log('\nDry run only. Re-run with --apply to write.'); return; }

    await uploadFile(pdf, R2_KEY);
    await seq.transaction(async (transaction) => {
      if (handouts.length) {
        await seq.query(
          `UPDATE course_content_items
              SET file_size = :size, is_published = true, linked_assignment_id = :assignmentId, updated_at = NOW()
            WHERE id = :id`,
          { replacements: { id: handouts[0].id, size: fs.statSync(pdf).size, assignmentId: EXISTING_ID }, transaction },
        );
      } else {
        await seq.query(
          `INSERT INTO course_content_items
             (id, course_id, title, content_type, file_name, file_size, r2_key, url,
              order_index, is_published, linked_assignment_id, role_filters, created_at, updated_at)
           VALUES (:id, :courseId, :title, 'handout', :fileName, :size, :r2Key, :url,
              0, true, :assignmentId, '{}', NOW(), NOW())`,
          {
            replacements: {
              id: uuidv4(), courseId: COURSE_ID, title: 'Attribution Workshop Squad Packet',
              fileName: FILE_NAME, size: fs.statSync(pdf).size, r2Key: R2_KEY, url: PUBLIC_URL,
              assignmentId: EXISTING_ID,
            },
            transaction,
          },
        );
      }
      await seq.query(
        'UPDATE assignments SET launch_briefing = :briefing, updated_at = NOW() WHERE id = :id',
        { replacements: { id: EXISTING_ID, briefing: LAUNCH_BRIEFING }, transaction },
      );
    });
    console.log(`\nUploaded ${path.basename(pdf)} -> ${PUBLIC_URL}; briefing updated.`);
  } finally {
    await seq.close();
  }
}

if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
