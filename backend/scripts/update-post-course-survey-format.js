'use strict';
/**
 * Adds/replaces the post-course survey's course-format section without
 * changing existing question IDs or prior survey responses.
 *
 * Run: node backend/scripts/update-post-course-survey-format.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Sequelize, QueryTypes } = require('sequelize');

const SURVEY_TITLE = 'Post-Course Survey';
const FORMAT_QUESTION_IDS = ['q29', 'q30', 'q31', 'q32', 'q33', 'q34', 'q35'];
const agreementOptions = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
  .map((value) => ({ label: value, value }));

const formatQuestions = [
  {
    id: 'q29', type: 'single', section: 'Evidence Drop & Investigation Format',
    prompt: 'The course sequence—receiving an evidence drop, investigating it, and then collaborating with others—supported my learning.',
    options: agreementOptions,
  },
  {
    id: 'q30', type: 'single', section: 'Evidence Drop & Investigation Format',
    prompt: 'Evidence drops arrived at an appropriate pace and contained a manageable amount of information.',
    options: agreementOptions,
  },
  {
    id: 'q31', type: 'single', section: 'Evidence Drop & Investigation Format',
    prompt: 'I had enough time to investigate and form my own conclusions before collaborating with others.',
    options: agreementOptions,
  },
  {
    id: 'q32', type: 'single', section: 'Evidence Drop & Investigation Format',
    prompt: 'Collaboration helped me identify connections, challenge assumptions, or reach conclusions I would not have reached alone.',
    options: agreementOptions,
  },
  {
    id: 'q33', type: 'single', section: 'Evidence Drop & Investigation Format',
    prompt: 'The balance between individual investigation and squad/class collaboration was appropriate.',
    options: agreementOptions,
  },
  {
    id: 'q34', type: 'single', section: 'Evidence Drop & Investigation Format',
    prompt: 'Which change would most improve the course format?',
    options: [
      'Keep the format as it is',
      'Provide more briefing before each evidence drop',
      'Allow more independent investigation time',
      'Allow more squad or class collaboration time',
      'Use smaller, more frequent evidence drops',
      'Use fewer, larger evidence drops',
      'Other (describe below)',
    ].map((value) => ({ label: value, value })),
  },
  {
    id: 'q35', type: 'text', section: 'Evidence Drop & Investigation Format',
    prompt: 'What specific changes, if any, would you recommend to the evidence drop, investigation, and collaboration format? Please explain what you would change and why.',
  },
];

function mergeFormatQuestions(existing = []) {
  const retained = existing.filter((question) => !FORMAT_QUESTION_IDS.includes(question.id));
  const applicationIndex = retained.findIndex((question) => question.section === 'Application Experience');
  if (applicationIndex < 0) return [...retained, ...formatQuestions];
  return [...retained.slice(0, applicationIndex), ...formatQuestions, ...retained.slice(applicationIndex)];
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres', dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }, logging: false,
  });
  try {
    const survey = await sequelize.query(
      `SELECT id, questions FROM assignments WHERE type = 'survey' AND title = :title ORDER BY created_at DESC LIMIT 1`,
      { replacements: { title: SURVEY_TITLE }, type: QueryTypes.SELECT, plain: true },
    );
    if (!survey) throw new Error(`Survey not found: ${SURVEY_TITLE}`);
    const questions = mergeFormatQuestions(Array.isArray(survey.questions) ? survey.questions : []);
    await sequelize.query(
      `UPDATE assignments SET questions = :questions, updated_at = NOW() WHERE id = :id`,
      { replacements: { id: survey.id, questions: JSON.stringify(questions) } },
    );
    console.log(`Updated ${SURVEY_TITLE}: ${questions.length} questions (${formatQuestions.length} course-format questions).`);
  } finally {
    await sequelize.close();
  }
}

module.exports = { FORMAT_QUESTION_IDS, formatQuestions, mergeFormatQuestions };
if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });
