'use strict';
/**
 * Export a survey's aggregate (anonymous) results to CSV, optionally scoped
 * to one cohort. Reuses surveyResults.service.js's getSurveyResults()
 * directly — same cohort-scoping-without-breaking-anonymity logic the admin
 * console's Export CSV button (AdminPage.jsx's SurveyResultsPanel) uses,
 * just from the command line instead of a browser Blob download.
 *
 * Usage:
 *   node backend/scripts/export-survey-results.js --cohort "September"
 *   node backend/scripts/export-survey-results.js --cohort "September" --survey "Post-Course Survey"
 *   node backend/scripts/export-survey-results.js --all-cohorts
 *
 * --cohort matches by case-insensitive substring against the cohort name
 * (so "September" matches "PACT September 26") — errors out listing matches
 * if that's ambiguous. --survey defaults to "Post-Course Survey"; also a
 * case-insensitive substring match. Output is written next to this script
 * as post-course-survey_<cohort-or-all_cohorts>_<date>.csv.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./lib/liveDb.js');
const path = require('path');
const fs = require('fs');
const { Assignment, Cohort } = require('../src/models');
const surveyResultsService = require('../src/services/surveyResults.service');

const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

function parseArgs(argv) {
  const args = { survey: 'Post-Course Survey' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cohort') args.cohort = argv[++i];
    else if (argv[i] === '--survey') args.survey = argv[++i];
    else if (argv[i] === '--all-cohorts') args.allCohorts = true;
  }
  return args;
}

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}
function csvRow(fields) {
  return fields.map(csvEscape).join(',') + '\r\n';
}
function buildSurveyCsv(results, cohortLabel) {
  let csv = '';
  csv += csvRow(['Survey', results.assignment?.title ?? '']);
  csv += csvRow(['Cohort', cohortLabel]);
  csv += csvRow(['Response count', results.response_count]);
  csv += csvRow(['Generated', new Date().toLocaleString()]);
  csv += '\r\n';

  for (const section of results.sections ?? []) {
    csv += csvRow([section.title]);
    if (section.distributions.length > 0) {
      csv += csvRow(['Question', 'Option', 'Count', 'Percent']);
      for (const q of section.distributions) {
        for (const option of q.options) {
          csv += csvRow([q.prompt, option.label, option.count, `${option.percent}%`]);
        }
      }
      csv += '\r\n';
    }
    for (const q of section.text_responses) {
      csv += csvRow([q.prompt]);
      csv += csvRow(['#', 'Response']);
      if (q.responses.length === 0) {
        csv += csvRow(['', '(no written responses)']);
      } else {
        q.responses.forEach((response, i) => { csv += csvRow([i + 1, response]); });
      }
      csv += '\r\n';
    }
  }
  return csv;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.cohort && !args.allCohorts) {
    throw new Error('Pass --cohort "<name substring>" or --all-cohorts.');
  }

  const assignment = await Assignment.findOne({
    where: { course_id: COURSE_ID, type: 'survey' },
    attributes: ['id', 'title'],
  });
  // (Single findOne is fine today — this course has exactly one survey row —
  // but if --survey ever needs to disambiguate among several, switch to
  // findAll + a title substring filter here.)
  if (!assignment) throw new Error(`No survey assignment found for course ${COURSE_ID}.`);

  let cohortId = null;
  let cohortLabel = 'All cohorts';
  if (args.cohort) {
    const matches = await Cohort.findAll({
      where: { course_id: COURSE_ID },
      attributes: ['id', 'name'],
    });
    const needle = args.cohort.toLowerCase();
    const hits = matches.filter((c) => c.name.toLowerCase().includes(needle));
    if (hits.length === 0) {
      throw new Error(`No cohort matches "${args.cohort}". Available: ${matches.map((c) => c.name).join(', ')}`);
    }
    if (hits.length > 1) {
      throw new Error(`"${args.cohort}" matches multiple cohorts: ${hits.map((c) => c.name).join(', ')} — be more specific.`);
    }
    cohortId = hits[0].id;
    cohortLabel = hits[0].name;
  }

  const results = await surveyResultsService.getSurveyResults(assignment.id, cohortId);

  if (results.results_suppressed) {
    console.log(`Results withheld: only ${results.response_count} response(s) submitted for ${cohortLabel} (minimum ${results.minimum_responses} required to protect anonymity). Nothing exported.`);
    process.exit(0);
  }
  if (results.response_count === 0) {
    console.log(`No submitted responses for ${cohortLabel}. Nothing exported.`);
    process.exit(0);
  }

  const csv = buildSurveyCsv(results, cohortLabel);
  const suffix = cohortLabel.replace(/[^\w.-]+/g, '_');
  const filename = `post-course-survey_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`;
  const outPath = path.join(__dirname, filename);
  // Leading BOM so Excel opens the UTF-8 file (em dashes, curly quotes in
  // free-text responses) without mangling it into Latin-1 mojibake.
  fs.writeFileSync(outPath, '﻿' + csv, 'utf8');

  console.log(`Exported ${results.response_count} response(s) for ${cohortLabel} to:`);
  console.log(outPath);
}

if (require.main === module) {
  // This script goes through the app's models (../src/models), which share
  // the long-lived pooled `sequelize` connection from config/database.js —
  // unlike scripts/lib/liveDb.js's one-off connections (closed via
  // seq.close() in their own finally blocks), nothing here ever closes that
  // pool, so the process just hangs opened, appearing to time out even after
  // a clean run. Force exit on both paths rather than leave it open.
  main()
    .then(() => process.exit(0))
    .catch((error) => { console.error(error.message); process.exit(1); });
}

module.exports = { buildSurveyCsv };
