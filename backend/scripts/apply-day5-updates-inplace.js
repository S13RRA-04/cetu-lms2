'use strict';
/**
 * Applies the current seed-day5-testimony-prep.js content (grading_mode:
 * 'squad', the corrected office-tp-5 wording, etc.) onto the EXISTING Day 5
 * Assignment rows in place, by title — instead of seed-day5-testimony-prep.js's
 * own destroy()+create(), which would cascade-delete every existing Grade and
 * Submission row (assignment_id is ON DELETE CASCADE) tied to the old IDs.
 *
 * Run this AFTER fix-day5-squad-consolidation.js has consolidated existing
 * individual grades — this script only changes assignment content/fields, not
 * grades/submissions, and preserves assignment IDs so those FKs stay valid.
 *
 * Run: node backend/scripts/apply-day5-updates-inplace.js
 */
require('dotenv').config();
const { Assignment } = require('../src/models');
const { ALL_ASSIGNMENTS } = require('./seed-day5-testimony-prep');

async function main() {
  for (const data of ALL_ASSIGNMENTS) {
    const existing = await Assignment.findOne({ where: { course_id: data.course_id, title: data.title } });
    if (!existing) {
      console.log(`NOT FOUND (skipped, no existing row to update in place): ${data.title}`);
      continue;
    }
    const { course_id, title, ...fields } = data;
    await existing.update(fields);
    console.log(`Updated in place: ${data.title} (id ${existing.id}) | grading_mode: ${existing.grading_mode}`);
  }
}

if (require.main === module) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { main };
