'use strict';
const { Assignment, Submission, LegalRequest } = require('../models');
const { callGemini } = require('../config/gemini');
const { NotFoundError, AppError } = require('../utils/errors');

const MAX_HISTORY = 20; // messages (both roles); caps LLM cost/abuse per session

/**
 * Context-aware "hint" persona (Training Agent) for the capstone. Unlike
 * tacticalSpecialist.service.js (stateless per-message) or
 * legalRequest.service.js (its own DB-tracked conversation), this reads the
 * student's actual progress straight from the DB each turn — the
 * submission's quiz_state.evidenceViewed (written by InvestigationGame via
 * the existing updateProgress flow) and approved LegalRequest rows — rather
 * than trusting anything the client sends, and never persists its own
 * state (advisory only, same as the Tactical Specialist).
 *
 * HINT_RULES mirrors lair-app/src/data/capstoneCase.js's evidence paths and
 * legalRequest.service.js's PROCESS_TYPES order by hand — keep all three in
 * sync if the case narrative or evidence tiers change. Same declarative,
 * first-unmet-rule-wins philosophy as this codebase's other gates — the hint
 * text itself is fixed content; the LLM only delivers it in an encouraging,
 * mentor-in-character voice.
 */
const HINT_RULES = [
  { id: 'brief',            check: (ctx) => !ctx.evidence.has('case-file/brief.txt'),
    hint: 'Start with case-file/brief.txt in the terminal — it lays out what you\'re allowed to review and why.' },
  { id: 'personnel',        check: (ctx) => !ctx.evidence.has('case-file/personnel_note.txt'),
    hint: 'Check case-file/personnel_note.txt — it narrows down who actually had after-hours access to this workstation.' },
  { id: 'logs',             check: (ctx) => !ctx.evidence.has('system-logs/outbound_connections.log') || !ctx.evidence.has('system-logs/auth_and_commands.log'),
    hint: 'Pull up both files under system-logs/ and line up their timestamps against each other — that\'s where the real pattern shows up.' },
  { id: 'staged',           check: (ctx) => !ctx.evidence.has('evidence/staged_files_manifest.txt'),
    hint: 'evidence/staged_files_manifest.txt will tell you what was actually being staged for exfiltration, and where.' },
  { id: 'need_subpoena',    check: (ctx) => !ctx.approved.has('subpoena'),
    hint: 'The external IP itself is outside this company\'s own records — you\'ll need to request legal process from the AUSA before you can learn anything more about it. Start with the lowest tier: an administrative subpoena.' },
  { id: 'review_subpoena',  check: (ctx) => !ctx.evidence.has('subpoena-returns/isp_subscriber_info.txt'),
    hint: 'Now that the subpoena is back, review subpoena-returns/isp_subscriber_info.txt in the terminal before your next request.' },
  { id: 'need_2703d',       check: (ctx) => !ctx.approved.has('order_2703d'),
    hint: 'Time to go a step further — request a §2703(d) order from the AUSA for communications metadata. It needs specific, articulable facts, not just a hunch.' },
  { id: 'review_2703d',     check: (ctx) => !ctx.evidence.has('comms-metadata/email_header_log.txt'),
    hint: 'Review comms-metadata/email_header_log.txt — it should independently corroborate something you already saw in the workstation\'s own logs.' },
  { id: 'need_warrant',     check: (ctx) => !ctx.approved.has('search_warrant'),
    hint: 'You should have enough now to go for probable cause — request the search warrant from the AUSA. Make sure you tie it to a specific place and specific items.' },
  { id: 'review_warrant',   check: (ctx) => !ctx.evidence.has('post-warrant/residence-search.txt') || !ctx.evidence.has('post-warrant/seized-devices.txt'),
    hint: 'The warrant\'s back — review everything under post-warrant/ in the terminal before you close this out.' },
];

function getNextHint(ctx) {
  return HINT_RULES.find((r) => r.check(ctx)) ?? null;
}

function buildSystemPrompt(rule) {
  return (
    'You are a Training Agent supporting a trainee DFIR analyst working a capstone case — a patient, ' +
    'encouraging mentor persona whose job is to help when they\'re stuck, distinct from the AUSA (who ' +
    'approves legal process) and Staff Ops (who runs down OSINT leads). Stay in character: supportive, ' +
    'never condescending.\n\n' +
    (rule
      ? `Give the trainee this specific piece of guidance, in your own encouraging words but without ` +
        `changing what it actually says or adding any facts beyond it:\n\n"${rule.hint}"`
      : 'The trainee has reviewed everything available and has every legal step approved. Congratulate ' +
        'them and tell them they have what they need to make an accusation with the `accuse <name>` ' +
        'command in the terminal — don\'t name anyone yourself.') +
    '\n\nKeep replies under 100 words.'
  );
}

async function chat(assignmentId, userId, history, message) {
  const assignment = await Assignment.findByPk(assignmentId, { attributes: ['id', 'type'] });
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.type !== 'capstone') throw new AppError('The Training Agent is only available for capstone assignments', 400, 'NOT_A_CAPSTONE');
  if (!message || !message.trim()) throw new AppError('message is required', 422, 'VALIDATION_ERROR');

  const [submission, legalRequests] = await Promise.all([
    Submission.findOne({ where: { assignment_id: assignmentId, user_id: userId } }),
    LegalRequest.findAll({ where: { assignment_id: assignmentId, user_id: userId } }),
  ]);

  const ctx = {
    evidence: new Set(submission?.quiz_state?.evidenceViewed ?? []),
    approved: new Set(legalRequests.filter((r) => r.status === 'approved').map((r) => r.request_type)),
  };

  const rule = getNextHint(ctx);
  const systemPrompt = buildSystemPrompt(rule);
  const trimmedHistory = (Array.isArray(history) ? history : []).slice(-MAX_HISTORY);
  const reply = await callGemini(systemPrompt, [...trimmedHistory, { role: 'user', content: message }]);

  return { reply };
}

module.exports = { HINT_RULES, getNextHint, chat };
