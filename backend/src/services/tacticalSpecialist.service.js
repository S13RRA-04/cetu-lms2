'use strict';
const { Assignment } = require('../models');
const { callGemini } = require('../config/gemini');
const { NotFoundError, AppError } = require('../utils/errors');

const MAX_HISTORY = 20; // messages (both roles); caps LLM cost/abuse per session

/**
 * Purely advisory OSINT-style consult persona ("Staff Operations / Tactical
 * Specialist") — unlike legalRequest.service.js's AUSA, this never gates or
 * unlocks anything, so there's no DB row, no approval state. Deterministic
 * canned facts per case (same substring-keyword-match philosophy as
 * legalRequest.service.js's `elements`), matched against only the latest
 * message (a per-question consult, not a cumulative justification). The LLM
 * is used only to phrase delivery in character — never to invent specifics.
 *
 * Deliberately does NOT reveal the subpoena-gated subscriber identity for
 * the IP lookup — OSINT is public-registry-level info only, preserving the
 * need for legalRequest.service.js's formal escalation chain.
 */
const LOOKUPS = [
  {
    id: 'ip_lookup',
    keywords: ['185.220', 'ip address', 'that ip', 'outbound ip', 'destination ip', 'who owns the ip', 'whois'],
    canned:
      'Public ASN/WHOIS data on that block shows it belongs to a commercial hosting range associated with ' +
      'anonymized personal cloud-storage services — commonly used for consumer backup/sync accounts. Public ' +
      'registries won\'t tell you who the specific account holder is; that\'s subscriber-level information the ' +
      'provider only releases under legal process, not something OSINT can pull.',
  },
  {
    id: 'reyes_background',
    keywords: ['reyes', 'daniel reyes', 'background on reyes', 'reyes social', 'reyes financial'],
    canned:
      'Open-source check on Daniel Reyes: a handful of public posts over the last two months referencing being ' +
      '"behind on some bills" and "tired of being broke" — nothing illegal on its face, but it\'s a plausible ' +
      'financial-motive angle worth keeping in your notes. No public information ties him to the specific IP or ' +
      'account, though — that would need to come from the workstation\'s own logs or later legal process.',
  },
  {
    id: 'webb_background',
    keywords: ['webb', 'marcus webb', 'background on webb'],
    canned:
      'Open-source check on Marcus Webb: standard professional profile, nothing unusual surfaces publicly. Not ' +
      'conclusive on its own — absence of a public red flag doesn\'t clear him, but there\'s nothing here ' +
      'pointing toward him either.',
  },
];

function findLookup(message) {
  const lower = message.toLowerCase();
  return LOOKUPS.find((l) => l.keywords.some((k) => lower.includes(k))) ?? null;
}

function buildSystemPrompt(hit) {
  return (
    'You are a Staff Operations / Tactical Specialist supporting a trainee DFIR analyst in a training ' +
    'exercise — an in-house resource for running down open-source/investigative leads, distinct from the ' +
    'AUSA (who handles formal legal process approval, not you). Stay in character: helpful, direct, a bit ' +
    'clipped, like an experienced analyst who fields a lot of these requests.\n\n' +
    (hit
      ? `You have the following finding to relay. State it faithfully — do not alter names, numbers, or ` +
        `caveats, and do not add any additional specifics beyond it:\n\n"${hit.canned}"`
      : 'Nothing matches what the trainee is asking for. Do not invent any specific facts, names, numbers, ' +
        'or findings. Respond in character — acknowledge the request, and either ask them to narrow it down ' +
        'or say you\'ll look into it and have nothing back yet.') +
    '\n\nKeep replies under 100 words.'
  );
}

async function chat(assignmentId, history, message) {
  const assignment = await Assignment.findByPk(assignmentId, { attributes: ['id', 'type'] });
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.type !== 'capstone') throw new AppError('The Tactical Specialist is only available for capstone assignments', 400, 'NOT_A_CAPSTONE');
  if (!message || !message.trim()) throw new AppError('message is required', 422, 'VALIDATION_ERROR');

  const trimmedHistory = (Array.isArray(history) ? history : []).slice(-MAX_HISTORY);
  const hit = findLookup(message);
  const systemPrompt = buildSystemPrompt(hit);
  const reply = await callGemini(systemPrompt, [...trimmedHistory, { role: 'user', content: message }]);

  return { reply };
}

module.exports = { LOOKUPS, findLookup, chat };
