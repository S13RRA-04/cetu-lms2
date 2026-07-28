'use strict';
const { LegalRequest, Assignment, Submission } = require('../models');
const { callGemini } = require('../config/gemini');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');

const MAX_TURNS = 8; // user+assistant pairs; caps LLM cost/abuse per request

/**
 * Case facts the AUSA persona needs to roleplay convincingly. Kept in sync
 * by hand with lair-app/src/data/capstoneCase.js's narrative — the frontend
 * owns the student-facing evidence tree, this is the backend's own copy of
 * just the facts needed to prompt the LLM. If the case narrative changes,
 * update both. Deliberately does NOT name a suspect — the base evidence
 * (auth logs cross-referenced against a personnel note naming two people
 * with access) is what's supposed to let a careful student narrow it down
 * themselves; handing the name to the AUSA persona's own prompt is fine
 * (it isn't shown to the student), but see PROCESS_TYPES' probeHints below
 * for the corresponding rule about student-facing text.
 */
const CASE_BRIEF =
  'Case: a Linux workstation at a small firm (Meridian Bank contractor) was found making unexplained ' +
  'outbound connections to an external IP. The system owner consented to a review of that ' +
  'workstation\'s own logs (no legal process was needed for that — it\'s the owner\'s own machine). ' +
  'Those logs show the workstation periodically connecting to that external IP, and show one of two ' +
  'employees with after-hours access (Daniel Reyes; the other, Marcus Webb, has no login history in ' +
  'the workstation\'s own logs during the relevant period) running commands that staged a copy of ' +
  'client financial records into a hidden directory shortly before each outbound connection. The ' +
  'external IP itself, and anything about who owns/controls it, is outside the company\'s own records — ' +
  'that requires third-party legal process, escalating in authority: (1) a grand jury subpoena for ' +
  'basic subscriber/account information tied to that IP, (2) an 18 U.S.C. §2703(d) order for non-content ' +
  'communications metadata from that account, and (3) a search warrant for the residence of whoever the ' +
  'first two steps implicate, once probable cause is established.';

/**
 * Ordered legal-process escalation for this case. This is the single source
 * of truth for sequencing (getNextProcessType), the deterministic pass/fail
 * gate (elements/keywords — same declarative marker/checks-style matching
 * philosophy as this codebase's terminal games, not real NLP), and the AUSA
 * persona's prompt content per stage.
 *
 * `probeHint` (not `label`) is what actually reaches the LLM prompt when an
 * element is unmet — phrased as a question to ask, in case-specific terms,
 * never as a named legal doctrine/checklist item. This is deliberate: an
 * earlier version passed literal element labels ("A stated connection
 * between the evidence sought and the residence") into the prompt asking
 * the model not to repeat them, and free-tier Gemini repeated them anyway.
 * Removing the literal label from what the model ever sees is the actual
 * fix — a "don't say X" instruction is much weaker than never providing X.
 */
const PROCESS_TYPES = [
  {
    id: 'subpoena',
    label: 'Grand Jury Subpoena',
    threshold: 'relevance',
    elements: [
      {
        id: 'states_target',
        keywords: ['subscriber', 'account holder', 'ip address', 'provider', 'cloud storage', '185.220', 'destination', 'who owns', 'who controls'],
        probeHint: 'Ask the trainee, in one sentence, exactly whose records or which account/IP they want the provider to identify — a subpoena naming no specific target won\'t be signed.',
      },
      {
        id: 'ties_to_investigation',
        keywords: ['outbound connection', 'exfiltrat', 'unauthorized', 'staged', 'client records', 'relevant', 'relate', 'investigation'],
        probeHint: 'Ask the trainee to connect the requested records back to the specific suspicious activity already observed on the workstation — why do these particular records matter to this case?',
      },
    ],
    unlocksEvidence: ['subpoena-returns/isp_subscriber_info.txt'],
    caseContextAfterApproval:
      '\n\nThe subpoena has already been served and returned: the destination IP resolves to a personal ' +
      'cloud-storage account, not a corporate one — meaning it is legally distinct from the workstation\'s ' +
      'own already-consented logs, and its subscriber information is now on record.',
  },
  {
    id: 'order_2703d',
    label: '§2703(d) Order',
    threshold: 'specific and articulable facts',
    elements: [
      {
        id: 'pattern_of_facts',
        keywords: ['repeated', 'multiple', 'pattern', 'each night', 'timestamp', 'dates', 'recurring', 'six', 'several'],
        probeHint: 'Ask the trainee to point to specific, dated instances from the logs rather than a general impression — a single vague assertion doesn\'t meet this standard.',
      },
      {
        id: 'materiality_to_comms',
        keywords: ['communicat', 'metadata', 'coordinat', 'correspond', 'contact', 'material', 'header'],
        probeHint: 'Ask why communications metadata specifically (as opposed to some other record type) would be material to proving what happened here.',
      },
    ],
    unlocksEvidence: ['comms-metadata/email_header_log.txt'],
    caseContextAfterApproval:
      '\n\nThe §2703(d) order has already been served and returned: non-content header metadata from that ' +
      'account independently corroborates the pattern already seen in the workstation\'s own logs — the ' +
      'timing lines up.',
  },
  {
    id: 'search_warrant',
    label: 'Search Warrant',
    threshold: 'probable cause',
    elements: [
      {
        id: 'nexus_to_residence',
        keywords: ['residence', 'home', 'house', 'apartment', 'personal device', 'his address'],
        probeHint: 'Ask the trainee why they believe the specific items sought would actually be found at that residence, as opposed to somewhere else.',
      },
      {
        id: 'ongoing_or_recent_activity',
        keywords: ['after hours', 'recent', 'repeated', 'periodically', 'ongoing', 'ongoing basis', 'multiple', 'each time', 'ip address', 'log'],
        probeHint: 'Ask the trainee to establish that the activity is recent/ongoing rather than old and stale — probable cause has to be current.',
      },
      {
        id: 'particularity',
        keywords: ['laptop', 'phone', 'device', 'computer', 'hard drive', 'storage', 'external drive'],
        probeHint: 'Ask the trainee to name the specific items to be seized — a warrant can\'t authorize a generic, unlimited search.',
      },
    ],
    unlocksEvidence: ['post-warrant/residence-search.txt', 'post-warrant/seized-devices.txt'],
  },
];

function getProcessType(id) {
  return PROCESS_TYPES.find((p) => p.id === id) ?? null;
}

/** First process type not yet in `approvedIds`, or null once all are done. */
function getNextProcessType(approvedIds) {
  return PROCESS_TYPES.find((p) => !approvedIds.includes(p.id)) ?? null;
}

function matchElement(text, element) {
  const lower = text.toLowerCase();
  return element.keywords.some((k) => lower.includes(k));
}

function evaluateElements(processType, justificationText) {
  const met = {};
  for (const el of processType.elements) met[el.id] = matchElement(justificationText, el);
  return met;
}

function buildSystemPrompt(processType, met, priorContext) {
  const unmet = processType.elements.filter((el) => !met[el.id]);
  const probeInstruction = unmet.length
    ? unmet[0].probeHint
    : 'Every required element has been addressed — respond with a short in-character approval and briefly state what this authorizes.';

  return (
    'You are an Assistant United States Attorney (AUSA) roleplaying inside a DFIR training exercise. ' +
    'A trainee analyst is asking you to approve a request for legal process. Stay strictly in character: ' +
    'professional and exacting. Never use the words "element," "requirement," or "checklist," never list ' +
    'more than one thing at a time, and never enumerate what you are evaluating even if asked directly — ' +
    'if pressed, deflect in character and ask a single grounded question instead.\n\n' +
    `${CASE_BRIEF}${priorContext}\n\n` +
    `The trainee is requesting: ${processType.label} (standard: ${processType.threshold}).\n\n` +
    (unmet.length
      ? `${probeInstruction} Do not approve yet.`
      : probeInstruction) +
    '\n\nKeep replies under 120 words.'
  );
}

async function getForStudent(assignmentId, userId) {
  const rows = await LegalRequest.findAll({
    where: { assignment_id: assignmentId, user_id: userId },
    order: [['created_at', 'ASC']],
  });
  return rows;
}

async function submitOrContinue(assignmentId, userId, requestId, message) {
  const assignment = await Assignment.findByPk(assignmentId, { attributes: ['id', 'type'] });
  if (!assignment) throw new NotFoundError('Assignment');
  if (assignment.type !== 'capstone') throw new AppError('Legal requests are only available for capstone assignments', 400, 'NOT_A_CAPSTONE');
  if (!message || !message.trim()) throw new AppError('message is required', 422, 'VALIDATION_ERROR');

  const existing = await getForStudent(assignmentId, userId);
  const approvedIds = existing.filter((r) => r.status === 'approved').map((r) => r.request_type);

  let request;
  if (requestId) {
    request = await LegalRequest.findByPk(requestId);
    if (!request) throw new NotFoundError('Legal request');
    if (request.user_id !== userId) throw new ForbiddenError();
    if (request.status !== 'pending') throw new AppError('This request has already been decided', 400, 'ALREADY_DECIDED');
  } else {
    const nextType = getNextProcessType(approvedIds);
    if (!nextType) throw new AppError('Every process type for this case has already been granted', 400, 'FULLY_ESCALATED');
    request = await LegalRequest.create({ assignment_id: assignmentId, user_id: userId, request_type: nextType.id });
  }

  const processType = getProcessType(request.request_type);
  const transcript = [...(request.transcript ?? []), { role: 'user', content: message, created_at: new Date().toISOString() }];

  if (transcript.filter((t) => t.role === 'user').length > MAX_TURNS) {
    throw new AppError('This conversation has reached its turn limit for this exercise', 429, 'TURN_LIMIT');
  }

  const justificationText = transcript.filter((t) => t.role === 'user').map((t) => t.content).join('\n');
  const met = evaluateElements(processType, justificationText);
  const allMet = processType.elements.every((el) => met[el.id]);

  const priorContext = PROCESS_TYPES
    .filter((p) => approvedIds.includes(p.id) && p.id !== processType.id)
    .map((p) => p.caseContextAfterApproval ?? '')
    .join('');

  const systemPrompt = buildSystemPrompt(processType, met, priorContext);
  const reply = await callGemini(systemPrompt, transcript.map((t) => ({ role: t.role, content: t.content })));

  transcript.push({ role: 'assistant', content: reply, created_at: new Date().toISOString() });

  request.transcript = transcript;
  request.required_elements_met = met;

  if (allMet) {
    request.status = 'approved';
    request.decided_at = new Date();
    request.unlocked_evidence_keys = processType.unlocksEvidence;

    const submission = await Submission.findOne({ where: { assignment_id: assignmentId, user_id: userId } });
    if (submission) {
      const allUnlocked = [...new Set([
        ...(submission.quiz_state?.unlockedEvidence ?? []),
        ...processType.unlocksEvidence,
      ])];
      const quizState = { ...(submission.quiz_state ?? {}), unlockedEvidence: allUnlocked, legalRequestId: request.id };
      await submission.update({ quiz_state: quizState });
    }
  }

  await request.save();
  return request;
}

module.exports = { getForStudent, submitOrContinue, PROCESS_TYPES, getNextProcessType };
