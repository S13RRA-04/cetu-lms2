'use strict';
/**
 * One-time ingestion of the final LAIR (Linux Analysis & Incident Response)
 * course content delivered in lair-app/lair-content: per-section PPTX decks,
 * student lab guides, and take-home learning guides. Uploads student-facing
 * files to R2 under lair/content/<section>/ and creates CourseContentItem
 * rows linked to the section's assignment (see the
 * 20240102000002-restructure-linux-dfir-assignments seeder for the
 * section -> assignment mapping, which this script reuses directly).
 *
 * Instructor-only files (lab instructor guides, pre/post-assessment answer
 * keys) are intentionally skipped — course_content_items has no staff-only
 * visibility gate (role_filters is for student professional roles), so
 * anything ingested here becomes visible to students the moment it's
 * published.
 *
 * All created items default to is_published: false, matching the course's
 * current draft status.
 *
 * Idempotent — matches existing rows by (course_id, linked_assignment_id,
 * file_name) and skips them.
 *
 * Run: node backend/scripts/ingest-lair-content.js <path-to-extracted-zip-root>
 * Dry run (no R2 upload / no DB writes): add --dry-run
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET, R2_PUBLIC_BASE_URL } = require('../src/config/r2');
const { CourseContentItem } = require('../src/models');
const { SECTION_TO_ASSIGNMENT, COURSE_ID } = require('../src/seeders/20240102000002-restructure-linux-dfir-assignments');

const DRY_RUN = process.argv.includes('--dry-run');
const rootArg = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
if (!rootArg) {
  console.error('Usage: node backend/scripts/ingest-lair-content.js <path-to-extracted-zip-root> [--dry-run]');
  process.exit(1);
}
const ROOT = path.resolve(rootArg);
const R2_PREFIX = 'lair/content/';

const AGENDA_FILE = 'Final_Agenda (1).txt';

function findMainDeck(sectionDir, sectionName) {
  const entries = fs.readdirSync(sectionDir, { withFileTypes: true });
  const pptx = entries.find((e) => e.isFile() && e.name.toLowerCase().endsWith('.pptx'));
  return pptx ? path.join(sectionDir, pptx.name) : null;
}

function findStudentLabGuide(sectionDir) {
  const entries = fs.readdirSync(sectionDir, { withFileTypes: true });
  const match = entries.find((e) =>
    e.isFile() && /student_guide\.docx$/i.test(e.name) && !/instructor/i.test(e.name));
  return match ? path.join(sectionDir, match.name) : null;
}

function findLearningGuide(sectionDir) {
  const handoutDir = path.join(sectionDir, 'Handout_Take_Home');
  if (!fs.existsSync(handoutDir)) return null;
  const entries = fs.readdirSync(handoutDir, { withFileTypes: true });
  const match = entries.find((e) => e.isFile() && e.name.toLowerCase().endsWith('.docx'));
  return match ? path.join(handoutDir, match.name) : null;
}

async function uploadToR2(filePath, r2Key) {
  const buffer = fs.readFileSync(filePath);
  const ext = filePath.split('.').pop().toLowerCase();
  const mimeType = ext === 'pptx'
    ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    : ext === 'docx'
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'text/plain';
  if (!DRY_RUN) {
    await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: r2Key, Body: buffer, ContentType: mimeType }));
  }
  return { size: buffer.length, url: `${R2_PUBLIC_BASE_URL}/${r2Key}` };
}

async function createIfMissing({ courseId, linkedAssignmentId, title, contentType, filePath, orderIndex, section }) {
  const fileName = path.basename(filePath);
  const existing = await CourseContentItem.findOne({
    where: { course_id: courseId, linked_assignment_id: linkedAssignmentId, file_name: fileName },
  });
  if (existing) {
    console.log(`  skip (exists): ${fileName}`);
    return 'skipped';
  }

  const r2Key = `${R2_PREFIX}${section}/${fileName}`;
  const { size, url } = await uploadToR2(filePath, r2Key);

  console.log(`  ${DRY_RUN ? '[dry-run] would create' : 'create'}: ${title} (${fileName}, ${size} bytes)`);
  if (DRY_RUN) return 'created';

  await CourseContentItem.create({
    course_id: courseId,
    title,
    content_type: contentType,
    url,
    r2_key: r2Key,
    file_name: fileName,
    file_size: size,
    linked_assignment_id: linkedAssignmentId,
    order_index: orderIndex,
    is_published: false,
  });
  return 'created';
}

async function main() {
  const zipRoot = fs.readdirSync(ROOT).find((name) => fs.statSync(path.join(ROOT, name)).isDirectory());
  const contentRoot = zipRoot ? path.join(ROOT, zipRoot) : ROOT;
  console.log(`Ingesting LAIR content from: ${contentRoot} (dry-run: ${DRY_RUN})\n`);

  const summary = { created: 0, skipped: 0, missing: [] };

  for (const [section, assignment] of Object.entries(SECTION_TO_ASSIGNMENT)) {
    const sectionDir = path.join(contentRoot, section);
    if (!fs.existsSync(sectionDir)) {
      summary.missing.push(section);
      console.log(`section not found on disk: ${section}`);
      continue;
    }
    console.log(`${section} -> assignment ${assignment.id}`);

    const deck = findMainDeck(sectionDir, section);
    const studentGuide = findStudentLabGuide(sectionDir);
    const learningGuide = findLearningGuide(sectionDir);

    const files = [
      deck && { filePath: deck, contentType: 'slides', title: `${section.replace(/_/g, ' ')} — Slides`, offset: 0 },
      learningGuide && { filePath: learningGuide, contentType: 'handout', title: `${section.replace(/_/g, ' ')} — Take-Home Learning Guide`, offset: 1 },
      studentGuide && { filePath: studentGuide, contentType: 'handout', title: `${section.replace(/_/g, ' ')} — Lab Student Guide`, offset: 2 },
    ].filter(Boolean);

    for (const f of files) {
      const result = await createIfMissing({
        courseId: COURSE_ID,
        linkedAssignmentId: assignment.id,
        title: f.title,
        contentType: f.contentType,
        filePath: f.filePath,
        orderIndex: assignment.order_index + f.offset,
        section,
      });
      summary[result] += 1;
    }
  }

  // Agenda — course-wide, not linked to a specific assignment. Ships
  // alongside the zip (lair-content/), not inside it, so check ROOT first.
  const agendaPath = [path.join(ROOT, AGENDA_FILE), path.join(contentRoot, AGENDA_FILE)]
    .find((p) => fs.existsSync(p));
  if (agendaPath) {
    const result = await createIfMissing({
      courseId: COURSE_ID,
      linkedAssignmentId: null,
      title: 'LAIR — Course Agenda',
      contentType: 'agenda',
      filePath: agendaPath,
      orderIndex: 0,
      section: '_agenda',
    });
    summary[result] += 1;
  }

  console.log('\n--- Summary ---');
  console.log(`Created: ${summary.created}`);
  console.log(`Skipped (already existed): ${summary.skipped}`);
  if (summary.missing.length) console.log(`Sections not found on disk: ${summary.missing.join(', ')}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
