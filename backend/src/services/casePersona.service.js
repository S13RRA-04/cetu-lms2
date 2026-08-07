'use strict';
const aiProvider = require('./ai/aiProvider');

/**
 * Generalizes legalRequest.service.js's AUSA-persona pattern into a
 * reusable character driven entirely by a `case_personas` DB row, instead
 * of a persona hand-coded into a service file. Used for interviews
 * (casePersona.service.js callers: caseInterview.service.js) and for the
 * legal-process prosecutor persona (caseLegalProcess.service.js).
 *
 * Critical rule (design brief §17 / §31): the persona must never be given
 * facts it wouldn't realistically know. `persona.unknown_facts` is
 * authoring documentation only (what a case author confirms this persona
 * correctly has no knowledge of) — it is deliberately NEVER interpolated
 * into the prompt, in either direction. An earlier draft of this file
 * listed unknown_facts as an explicit "don't reveal these" block, on the
 * theory that a firm instruction would suppress them; legalRequest.service.js
 * already documents why that backfires (a literal "don't say X" is far
 * weaker than simply never providing X, and free-tier models have been
 * observed repeating the very thing they were told to withhold). The actual
 * guarantee here is structural: the model has no way to leak information it
 * was never given, so unknown_facts stays out of the prompt entirely.
 */

function buildSystemPrompt(persona, { caseContext = '', extraInstructions = '' } = {}) {
  const knownFactsText = (persona.known_facts || []).map((f) => `- ${f}`).join('\n');
  const disclosureText = (persona.allowed_disclosures || []).map((f) => `- ${f}`).join('\n');
  const objectivesText = (persona.objectives || []).map((f) => `- ${f}`).join('\n');
  const constraintsText = (persona.constraints || []).map((f) => `- ${f}`).join('\n');

  return [
    `You are roleplaying "${persona.name}", a ${persona.role_type} in an investigative training exercise. ` +
      'Stay strictly in character at all times. If asked about anything you have not been told here, respond ' +
      'as someone who genuinely does not know — never guess, invent, or confirm details you were not given.',
    persona.personality ? `Personality: ${persona.personality}` : '',
    caseContext ? `Case context: ${caseContext}` : '',
    knownFactsText ? `Facts you personally know and may discuss if relevant:\n${knownFactsText}` : '',
    disclosureText ? `You will only volunteer or confirm these specific things:\n${disclosureText}` : '',
    objectivesText ? `Your objectives in this conversation:\n${objectivesText}` : '',
    constraintsText ? `Constraints on how you respond:\n${constraintsText}` : '',
    extraInstructions,
    'Keep replies under 120 words. Never break character, never mention that you are an AI.',
  ].filter(Boolean).join('\n\n');
}

async function chat(persona, transcript, message, opts = {}) {
  const systemPrompt = buildSystemPrompt(persona, opts);
  const history = transcript.map((t) => ({ role: t.role, content: t.content }));
  return aiProvider.roleplay(systemPrompt, [...history, { role: 'user', content: message }], { maxTokens: opts.maxTokens ?? 400 });
}

module.exports = { buildSystemPrompt, chat };
