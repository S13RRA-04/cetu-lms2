'use strict';
const {
  InvestigationCase, CaseEntity, CasePersona, CaseHypothesis, CaseLegalProcess,
  CaseInterview, Enrollment, Squad, SquadCaseState, CaseAction,
} = require('../models');
const { NotFoundError, AppError } = require('../utils/errors');
const caseEngine = require('../services/caseEngine.service');
const caseActionInterpreter = require('../services/caseActionInterpreter.service');
const caseEvidenceService = require('../services/caseEvidence.service');
const caseHypothesisService = require('../services/caseHypothesis.service');
const caseLegalProcessService = require('../services/caseLegalProcess.service');
const caseInterviewService = require('../services/caseInterview.service');

/** Resolves the requesting student's squad within this course, and this assignment's case. Shared by every student-facing handler below. */
async function resolveContext(req) {
  const { id: courseId, aid: assignmentId } = req.params;

  const investigationCase = await InvestigationCase.findOne({ where: { assignment_id: assignmentId } });
  if (!investigationCase) throw new NotFoundError('Investigation case');

  const enrollment = await Enrollment.findOne({ where: { user_id: req.user.id, course_id: courseId } });
  const squadId = enrollment?.squad_id ?? null;
  if (!squadId) throw new AppError('You are not assigned to a squad for this course', 400, 'NO_SQUAD');

  return { investigationCase, squadId, role: req.user.professional_role ?? null };
}

async function getCase(req, res, next) {
  try {
    const { investigationCase } = await resolveContext(req);
    res.json({
      id: investigationCase.id,
      title: investigationCase.title,
      synopsis: investigationCase.synopsis,
      learning_objectives: investigationCase.learning_objectives,
    });
  } catch (err) { next(err); }
}

async function getState(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    const state = await caseEngine.getState(investigationCase.id, squadId);
    res.json(state);
  } catch (err) { next(err); }
}

async function getEntities(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    const state = await caseEngine.getState(investigationCase.id, squadId);
    const ids = state.discovered_entity_ids || [];
    const entities = ids.length ? await CaseEntity.findAll({ where: { case_id: investigationCase.id, id: ids } }) : [];
    res.json(entities);
  } catch (err) { next(err); }
}

async function getEvidence(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    res.json(await caseEvidenceService.getDiscoveredEvidence(investigationCase.id, squadId));
  } catch (err) { next(err); }
}

async function getPersonas(req, res, next) {
  try {
    const { investigationCase } = await resolveContext(req);
    const personas = await CasePersona.findAll({ where: { case_id: investigationCase.id }, attributes: ['id', 'role_type', 'name'] });
    res.json(personas);
  } catch (err) { next(err); }
}

async function listActions(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    res.json(await caseEngine.listActions(investigationCase.id, squadId));
  } catch (err) { next(err); }
}

async function submitAction(req, res, next) {
  try {
    const { investigationCase, squadId, role } = await resolveContext(req);
    const { message, action_type: actionType, target_entity_id: targetEntityId } = req.body;

    let result;
    if (actionType) {
      result = await caseEngine.evaluateAction({
        caseId: investigationCase.id, squadId, actionType, targetEntityId: targetEntityId ?? null,
        studentId: req.user.id, role, justificationText: message ?? null,
      });
    } else {
      if (!message || !message.trim()) throw new AppError('message is required', 422, 'VALIDATION_ERROR');
      result = await caseActionInterpreter.interpretAndEvaluate({
        caseId: investigationCase.id, squadId, freeText: message, studentId: req.user.id, role,
      });
    }
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function listHypotheses(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    res.json(await caseHypothesisService.list(investigationCase.id, squadId));
  } catch (err) { next(err); }
}

async function createHypothesis(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    res.status(201).json(await caseHypothesisService.create(investigationCase.id, squadId, req.user.id, req.body));
  } catch (err) { next(err); }
}

async function reviseHypothesis(req, res, next) {
  try {
    const { squadId } = await resolveContext(req);
    res.json(await caseHypothesisService.revise(req.params.hid, squadId, req.user.id, req.body));
  } catch (err) { next(err); }
}

async function challengeHypothesis(req, res, next) {
  try {
    const { squadId } = await resolveContext(req);
    res.json(await caseHypothesisService.challenge(req.params.hid, squadId));
  } catch (err) { next(err); }
}

async function getLegalProcess(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    res.json(await caseLegalProcessService.getForSquad(investigationCase.id, squadId));
  } catch (err) { next(err); }
}

async function submitLegalProcess(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    const { message, request_id: requestId } = req.body;
    res.status(201).json(await caseLegalProcessService.submitOrContinue(investigationCase.id, squadId, req.user.id, message, requestId ?? null));
  } catch (err) { next(err); }
}

async function getInterview(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    res.json(await caseInterviewService.getForSquad(investigationCase.id, squadId, req.params.personaId));
  } catch (err) { next(err); }
}

async function submitInterview(req, res, next) {
  try {
    const { investigationCase, squadId } = await resolveContext(req);
    const { message, interview_id: interviewId } = req.body;
    res.status(201).json(await caseInterviewService.submitOrContinue(investigationCase.id, squadId, req.params.personaId, req.user.id, message, interviewId ?? null));
  } catch (err) { next(err); }
}

// ── Instructor ──────────────────────────────────────────────────────────

async function instructorDashboard(req, res, next) {
  try {
    const investigationCase = await InvestigationCase.findOne({ where: { assignment_id: req.params.aid } });
    if (!investigationCase) throw new NotFoundError('Investigation case');

    const states = await SquadCaseState.findAll({ where: { case_id: investigationCase.id }, include: [{ model: Squad, as: 'squad' }] });

    const squads = await Promise.all(states.map(async (state) => {
      const [actionCount, hypotheses, legalProcesses, interviews] = await Promise.all([
        CaseAction.count({ where: { case_id: investigationCase.id, squad_id: state.squad_id } }),
        CaseHypothesis.findAll({ where: { case_id: investigationCase.id, squad_id: state.squad_id }, order: [['created_at', 'DESC']] }),
        CaseLegalProcess.findAll({ where: { case_id: investigationCase.id, squad_id: state.squad_id } }),
        CaseInterview.findAll({ where: { case_id: investigationCase.id, squad_id: state.squad_id } }),
      ]);
      return { squad: state.squad, state, actionCount, hypotheses, legalProcesses, interviews };
    }));

    res.json({ case: investigationCase, squads });
  } catch (err) { next(err); }
}

async function inject(req, res, next) {
  try {
    const investigationCase = await InvestigationCase.findOne({ where: { assignment_id: req.params.aid } });
    if (!investigationCase) throw new NotFoundError('Investigation case');

    const { squad_id: squadId, action_type: actionType, target_entity_id: targetEntityId, note } = req.body;
    if (!squadId || !actionType) throw new AppError('squad_id and action_type are required', 422, 'VALIDATION_ERROR');

    const result = await caseEngine.evaluateAction({
      caseId: investigationCase.id, squadId, actionType, targetEntityId: targetEntityId ?? null,
      studentId: null, role: 'facilitator', justificationText: note ?? null, isInject: true,
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

module.exports = {
  getCase, getState, getEntities, getEvidence, getPersonas, listActions, submitAction,
  listHypotheses, createHypothesis, reviseHypothesis, challengeHypothesis,
  getLegalProcess, submitLegalProcess, getInterview, submitInterview,
  instructorDashboard, inject,
};
