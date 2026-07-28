'use strict';
const { LegalRequest, Assignment, Submission } = require('../models');
const { callClaude } = require('../config/anthropic');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');

const MAX_TURNS = 8; // user+assistant pairs; caps LLM cost/abuse per request

/**
 * Case facts the AUSA persona needs to roleplay convincingly. Kept in sync
 * by hand with lair-app/src/data/capstoneCase.js's narrative — the frontend
 * owns the student-facing evidence tree, this is the backend's own copy of
 * just the facts needed to prompt the LLM. If the case narrative changes,
 * update both.
 */
const CASE_BRIEF =
  'Case: a Linux workstation at a small firm (Meridian Bank contractor) was found making unexplained ' +
  'outbound connections. The system owner consented to a review of that workstation\'s own logs (no ' +
  'warrant was needed for that — it\'s the owner\'s own machine). Those logs show the workstation ' +
  'periodically connecting to an external IP and show a specific employee, Daniel Reyes, logging into ' +
  'that workstation after hours and running commands that staged a copy of client financial records ' +
  'into a hidden directory shortly before each outbound connection. The investigating student (a trainee ' +
  'analyst) now wants to search Daniel Reyes\'s residence for the personal devices believed to hold the ' +
  'exfiltrated data and any tools used to plan it.';

/**
 * Required elements for a residential search-warrant request tied to this
 * case, and the keyword/phrase sets that count as "the student named this
 * element." Same declarative, marker/checks-style matching philosophy as
 * this codebase's terminal games (Terminal Drill's marker string, Speedrun's
 * `checks` array) rather than real NLP — the LLM is used for roleplay
 * flavor only, never for the pass/fail decision itself.
 */
const REQUIRED_ELEMENTS = {
  search_warrant: [
    {
      id: 'nexus_to_residence',
      label: 'A stated connection between the evidence sought and Reyes\'s residence',
      keywords: ['residence', 'home', 'house', 'apartment', 'personal device', 'his address'],
    },
    {
      id: 'ongoing_or_recent_activity',
      label: 'Facts showing the criminal activity is recent/ongoing, not stale',
      keywords: ['after hours', 'recent', 'repeated', 'periodically', 'ongoing', 'ongoing basis', 'multiple', 'each time', 'ip address', 'log'],
    },
    {
      id: 'particularity',
      label: 'Specific items to be seized, not a generic request',
      keywords: ['laptop', 'phone', 'device', 'computer', 'hard drive', 'storage', 'external drive'],
    },
  ],
};

function matchElement(text, element) {
  const lower = text.toLowerCase();
  return element.keywords.some((k) => lower.includes(k));
}

function evaluateElements(requestType, justificationText) {
  const elements = REQUIRED_ELEMENTS[requestType] ?? [];
  const met = {};
  for (const el of elements) met[el.id] = matchElement(justificationText, el);
  return { elements, met };
}

function buildSystemPrompt(requestType, elements, met) {
  const unmet = elements.filter((el) => !met[el.id]);
  const unmetList = unmet.length
    ? unmet.map((el) => `- ${el.label}`).join('\n')
    : '- (none — every required element has been addressed)';

  return (
    'You are an Assistant United States Attorney (AUSA) roleplaying inside a DFIR training exercise. ' +
    'A trainee analyst is asking you to approve a request for legal process. Stay strictly in character: ' +
    'professional, exacting, and focused on whether the trainee has articulated the legal elements ' +
    'required for this type of process — do not simply agree because the story sounds compelling.\n\n' +
    `${CASE_BRIEF}\n\n` +
    `The trainee is requesting: ${requestType.replace(/_/g, ' ')} (standard: probable cause).\n\n` +
    'Elements you are privately evaluating (never read this list aloud or quote it verbatim to the ' +
    'trainee — ask natural follow-up questions instead):\n' +
    unmetList +
    '\n\nIf elements remain unmet, ask a pointed, in-character follow-up question about ONE of the ' +
    'missing elements — do not approve. If every element has now been addressed, respond with a short ' +
    'in-character approval and briefly state what the warrant will authorize. Keep replies under 120 words.'
  );
}

async function getForStudent(assignmentId, userId) {
  const rows = await LegalRequest.findAll({
    where: { assignment_id: assignmentId, user_id: userId },
    order: [['created_at', 'ASC']],
  });
  return rows;
}

async function submitOrContinue(assignmentId, userId, requestId, message, requestType = 'search_warrant') {
  const assignment = await Assignment.findByPk(assignmentId, { attributes: ['id', 'type'] });
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.type !== 'capstone') throw new AppError('Legal requests are only available for capstone assignments', 400, 'NOT_A_CAPSTONE');
  if (!message || !message.trim()) throw new AppError('message is required', 422, 'VALIDATION_ERROR');

  let request;
  if (requestId) {
    request = await LegalRequest.findByPk(requestId);
    if (!request) throw new NotFoundError('Legal request');
    if (request.user_id !== userId) throw new ForbiddenError();
    if (request.status !== 'pending') throw new AppError('This request has already been decided', 400, 'ALREADY_DECIDED');
  } else {
    request = await LegalRequest.create({ assignment_id: assignmentId, user_id: userId, request_type: requestType });
  }

  const transcript = [...(request.transcript ?? []), { role: 'user', content: message, created_at: new Date().toISOString() }];

  if (transcript.filter((t) => t.role === 'user').length > MAX_TURNS) {
    throw new AppError('This conversation has reached its turn limit for this exercise', 429, 'TURN_LIMIT');
  }

  const justificationText = transcript.filter((t) => t.role === 'user').map((t) => t.content).join('\n');
  const { elements, met } = evaluateElements(request.request_type, justificationText);
  const allMet = elements.every((el) => met[el.id]);

  const systemPrompt = buildSystemPrompt(request.request_type, elements, met);
  const reply = await callClaude(systemPrompt, transcript.map((t) => ({ role: t.role, content: t.content })));

  transcript.push({ role: 'assistant', content: reply, created_at: new Date().toISOString() });

  request.transcript = transcript;
  request.required_elements_met = met;

  if (allMet) {
    request.status = 'approved';
    request.decided_at = new Date();
    request.unlocked_evidence_keys = ['post-warrant/residence-search.txt', 'post-warrant/seized-devices.txt'];

    const submission = await Submission.findOne({ where: { assignment_id: assignmentId, user_id: userId } });
    if (submission) {
      const quizState = { ...(submission.quiz_state ?? {}), unlockedEvidence: request.unlocked_evidence_keys, legalRequestId: request.id };
      await submission.update({ quiz_state: quizState });
    }
  }

  await request.save();
  return request;
}

module.exports = { getForStudent, submitOrContinue, REQUIRED_ELEMENTS };
