'use strict';
const { CaseInterview, CasePersona } = require('../models');
const { NotFoundError, AppError, ForbiddenError } = require('../utils/errors');
const casePersonaService = require('./casePersona.service');

const MAX_TURNS = 12; // user+assistant pairs per interview; caps LLM cost/abuse

async function getForSquad(caseId, squadId, personaId) {
  return CaseInterview.findAll({ where: { case_id: caseId, squad_id: squadId, persona_id: personaId }, order: [['created_at', 'ASC']] });
}

/** One active interview per squad+persona — mirrors legalRequest.service.js's submitOrContinue shape. */
async function submitOrContinue(caseId, squadId, personaId, studentId, message, interviewId = null) {
  if (!message || !message.trim()) throw new AppError('message is required', 422, 'VALIDATION_ERROR');

  const persona = await CasePersona.findOne({ where: { id: personaId, case_id: caseId } });
  if (!persona) throw new NotFoundError('Persona');

  let interview;
  if (interviewId) {
    interview = await CaseInterview.findByPk(interviewId);
    if (!interview) throw new NotFoundError('Interview');
    if (interview.squad_id !== squadId) throw new ForbiddenError();
    if (interview.status !== 'in_progress') throw new AppError('This interview has already concluded', 400, 'ALREADY_CONCLUDED');
  } else {
    interview = await CaseInterview.findOne({ where: { case_id: caseId, squad_id: squadId, persona_id: personaId, status: 'in_progress' } });
    if (!interview) {
      interview = await CaseInterview.create({ case_id: caseId, squad_id: squadId, persona_id: personaId, student_id: studentId });
    }
  }

  const transcript = [...(interview.transcript ?? []), { role: 'user', content: message, created_at: new Date().toISOString() }];

  if (transcript.filter((t) => t.role === 'user').length > MAX_TURNS) {
    throw new AppError('This interview has reached its turn limit', 429, 'TURN_LIMIT');
  }

  const reply = await casePersonaService.chat(persona, transcript.slice(0, -1), message);
  transcript.push({ role: 'assistant', content: reply, created_at: new Date().toISOString() });

  interview.transcript = transcript;
  await interview.save();
  return interview;
}

async function conclude(interviewId, squadId) {
  const interview = await CaseInterview.findByPk(interviewId);
  if (!interview) throw new NotFoundError('Interview');
  if (interview.squad_id !== squadId) throw new ForbiddenError();
  interview.status = 'concluded';
  await interview.save();
  return interview;
}

module.exports = { getForSquad, submitOrContinue, conclude, MAX_TURNS };
