'use strict';
/**
 * Recursively syncs the dedicated "lair" R2 bucket (public domain
 * lair-storage.cetu.online) into CourseContentItem rows, linking each file
 * to its section's assignment via SECTION_TO_ASSIGNMENT (reused from the
 * 20240102000002 restructure seeder — same section-folder-name -> assignment
 * mapping used by the original ingest-lair-content.js).
 *
 * Unlike ingest-lair-content.js (which uploaded local files into the shared
 * "pact" bucket under a lair/ prefix, a stopgap before this bucket existed),
 * this script only reads — the files already live in R2. It stores a full
 * absolute `url` per item (not r2_key + the shared R2_PUBLIC_BASE_URL, which
 * points at the pact bucket's domain) since this is a different bucket with
 * its own public domain.
 *
 * Idempotent and safe to re-run any time new files are added to the bucket:
 * matches existing rows by (course_id, linked_assignment_id, file_name) and
 * updates url/file_size in place rather than creating duplicates. This also
 * repoints any rows created earlier by ingest-lair-content.js (which pointed
 * at the pact bucket) onto this bucket instead.
 *
 * Instructor-only files (lab instructor guides, pre/post-assessment answer
 * keys) are skipped for the same reason as before: course_content_items has
 * no staff-only visibility gate.
 *
 * Run: node backend/scripts/sync-lair-r2-content.js [--dry-run]
 */

require('dotenv').config();
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { CourseContentItem } = require('../src/models');
const { SECTION_TO_ASSIGNMENT, COURSE_ID } = require('../src/seeders/20240102000002-restructure-linux-dfir-assignments');

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'lair';
const PUBLIC_BASE_URL = 'https://lair-storage.cetu.online';
const AGENDA_FILE = 'Final_Agenda (1).txt';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function listAllObjects() {
  const objects = [];
  let continuationToken;
  do {
    const resp = await r2Client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuationToken,
    }));
    for (const obj of resp.Contents ?? []) {
      if (obj.Key.endsWith('/') || obj.Size === 0) continue; // directory markers
      objects.push({ key: obj.Key, size: obj.Size ?? null });
    }
    continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (continuationToken);
  return objects;
}

function isInstructorOnly(key) {
  return /instructor/i.test(key) || /ANSWERKEY/i.test(key);
}

function classify(key) {
  const parts = key.split('/');
  const fileName = parts[parts.length - 1];

  if (key === AGENDA_FILE) {
    return { section: null, contentType: 'agenda', title: 'LAIR — Course Agenda' };
  }
  if (isInstructorOnly(key)) return null; // skip

  // content/<Section>/[Handout_Take_Home/]<file>
  if (parts[0] !== 'content' || parts.length < 3) return null;
  const section = parts[1];
  if (!(section in SECTION_TO_ASSIGNMENT)) return null;

  const sectionLabel = section.replace(/_/g, ' ');
  if (fileName.toLowerCase().endsWith('.pptx')) {
    return { section, contentType: 'slides', title: `${sectionLabel} — Slides` };
  }
  if (parts.includes('Handout_Take_Home')) {
    return { section, contentType: 'handout', title: `${sectionLabel} — Take-Home Learning Guide` };
  }
  if (/student_guide\.docx$/i.test(fileName)) {
    return { section, contentType: 'handout', title: `${sectionLabel} — Lab Student Guide` };
  }
  return null; // unrecognized file in a known section folder — leave untouched
}

async function main() {
  const objects = await listAllObjects();
  console.log(`Found ${objects.length} objects in bucket "${BUCKET}" (dry-run: ${DRY_RUN})\n`);

  const summary = { created: 0, updated: 0, unchanged: 0, skipped: 0 };

  for (const obj of objects) {
    const info = classify(obj.key);
    if (!info) { summary.skipped += 1; continue; }

    const fileName = obj.key.split('/').pop();
    const url = `${PUBLIC_BASE_URL}/${encodeURI(obj.key)}`;
    const linkedAssignmentId = info.section ? SECTION_TO_ASSIGNMENT[info.section].id : null;
    const orderIndex = info.section
      ? SECTION_TO_ASSIGNMENT[info.section].order_index + (info.contentType === 'slides' ? 0 : info.title.includes('Learning Guide') ? 1 : 2)
      : 0;

    const existing = await CourseContentItem.findOne({
      where: { course_id: COURSE_ID, linked_assignment_id: linkedAssignmentId, file_name: fileName },
    });

    if (existing) {
      const changed = existing.url !== url || existing.file_size !== obj.size || existing.r2_key !== null;
      if (changed) {
        console.log(`  ${DRY_RUN ? '[dry-run] would update' : 'update'}: ${info.title} (${fileName})`);
        if (!DRY_RUN) await existing.update({ url, r2_key: null, file_size: obj.size });
        summary.updated += 1;
      } else {
        summary.unchanged += 1;
      }
    } else {
      console.log(`  ${DRY_RUN ? '[dry-run] would create' : 'create'}: ${info.title} (${fileName})`);
      if (!DRY_RUN) {
        await CourseContentItem.create({
          course_id: COURSE_ID,
          title: info.title,
          content_type: info.contentType,
          url,
          r2_key: null,
          file_name: fileName,
          file_size: obj.size,
          linked_assignment_id: linkedAssignmentId,
          order_index: orderIndex,
          is_published: false,
        });
      }
      summary.created += 1;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Created:   ${summary.created}`);
  console.log(`Updated:   ${summary.updated}`);
  console.log(`Unchanged: ${summary.unchanged}`);
  console.log(`Skipped (instructor-only / unrecognized): ${summary.skipped}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
