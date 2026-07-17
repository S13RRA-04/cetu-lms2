'use strict';
const { Op } = require('sequelize');
const { Assignment, Submission } = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const FORMAT_SECTION = 'Evidence Drop & Investigation Format';
const MIN_ANONYMOUS_RESPONSES = 3;
function shouldSuppressAnonymousResults(responseCount) {
  return responseCount < MIN_ANONYMOUS_RESPONSES;
}
const THEMES = [
  { key: 'pacing_volume', label: 'Evidence pacing and volume', terms: ['pace', 'pacing', 'faster', 'slower', 'smaller', 'larger', 'frequent', 'amount', 'overwhelm'] },
  { key: 'investigation_time', label: 'Independent investigation time', terms: ['investigat', 'independent', 'more time', 'less time', 'analyz', 'analyse'] },
  { key: 'collaboration', label: 'Collaboration and information sharing', terms: ['collaborat', 'squad', 'team', 'group', 'share', 'discussion', 'class'] },
  { key: 'briefing_guidance', label: 'Briefing and guidance', terms: ['brief', 'instruction', 'guidance', 'explain', 'expectation', 'direction'] },
  { key: 'technology', label: 'Application and tools', terms: ['app', 'tool', 'bug', 'technical', 'interface', 'website', 'system'] },
  { key: 'no_change', label: 'Keep the format', terms: ['no change', 'nothing', 'keep', 'as is', 'worked well'] },
];
function parseResponses(content) { try { const value = typeof content === 'string' ? JSON.parse(content) : content; return value?.surveyResponses && typeof value.surveyResponses === 'object' ? value.surveyResponses : null; } catch { return null; } }
function groupRecommendations(comments) {
  const groups = new Map(THEMES.map((theme) => [theme.key, { key: theme.key, label: theme.label, comments: [] }]));
  groups.set('other', { key: 'other', label: 'Other recommendations', comments: [] });
  for (const comment of comments) {
    const matches = THEMES.filter((theme) => theme.terms.some((term) => comment.toLowerCase().includes(term)));
    for (const theme of matches.length ? matches : [{ key: 'other' }]) groups.get(theme.key).comments.push(comment);
  }
  return [...groups.values()].filter((group) => group.comments.length).map((group) => ({ ...group, count: group.comments.length }));
}
function aggregateSurveyResults(questions, responseSets) {
  const formatQuestions = questions.filter((question) => question.section === FORMAT_SECTION);
  const distributions = formatQuestions.filter((question) => question.type !== 'text').map((question) => {
    const counts = Object.fromEntries((question.options ?? []).map((option) => [option.value, 0]));
    for (const responses of responseSets) if (Object.hasOwn(counts, responses[question.id])) counts[responses[question.id]]++;
    const answered = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return { id: question.id, prompt: question.prompt, answered, options: (question.options ?? []).map((option) => ({ value: option.value, label: option.label, count: counts[option.value], percent: answered ? Math.round(counts[option.value] / answered * 100) : 0 })) };
  });
  const comments = responseSets.map((responses) => String(responses.q35 ?? '').trim()).filter(Boolean);
  return { response_count: responseSets.length, distributions, recommendation_count: comments.length, recommendation_groups: groupRecommendations(comments) };
}
async function getSurveyResults(assignmentId) {
  const assignment = await Assignment.findByPk(assignmentId, { attributes: ['id', 'title', 'type', 'questions'] });
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.type !== 'survey') throw new AppError('Results aggregation is available only for surveys', 400, 'NOT_A_SURVEY');
  const rows = await Submission.findAll({ where: { assignment_id: assignmentId, status: { [Op.in]: ['submitted', 'graded', 'returned'] } }, attributes: ['content'] });
  const responses = rows.map((row) => parseResponses(row.content)).filter(Boolean);
  if (shouldSuppressAnonymousResults(responses.length)) {
    return {
      assignment: { id: assignment.id, title: assignment.title },
      response_count: responses.length,
      minimum_responses: MIN_ANONYMOUS_RESPONSES,
      results_suppressed: true,
      distributions: [],
      recommendation_count: 0,
      recommendation_groups: [],
    };
  }
  return { assignment: { id: assignment.id, title: assignment.title }, ...aggregateSurveyResults(assignment.questions ?? [], responses) };
}
module.exports = { MIN_ANONYMOUS_RESPONSES, shouldSuppressAnonymousResults, parseResponses, groupRecommendations, aggregateSurveyResults, getSurveyResults };
