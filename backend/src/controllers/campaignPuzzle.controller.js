'use strict';
const campaignPuzzleService = require('../services/campaignPuzzle.service');

async function listPuzzles(req, res, next) {
  try {
    res.json(await campaignPuzzleService.listPuzzlesForDrop(req.params.did, { includeAnswers: true }));
  } catch (err) { next(err); }
}

async function createPuzzle(req, res, next) {
  try { res.status(201).json(await campaignPuzzleService.createPuzzle(req.params.did, req.body)); }
  catch (err) { next(err); }
}

async function updatePuzzle(req, res, next) {
  try { res.json(await campaignPuzzleService.updatePuzzle(req.params.did, req.params.puzzleId, req.body)); }
  catch (err) { next(err); }
}

async function deletePuzzle(req, res, next) {
  try { await campaignPuzzleService.deletePuzzle(req.params.did, req.params.puzzleId); res.status(204).end(); }
  catch (err) { next(err); }
}

async function reorderPuzzles(req, res, next) {
  try {
    res.json(await campaignPuzzleService.reorderPuzzles(req.params.did, req.body.ordered_ids));
  } catch (err) { next(err); }
}

async function verifyPuzzle(req, res, next) {
  try {
    const { valid } = await campaignPuzzleService.verifyPuzzleAnswer(req.params.did, req.params.puzzleId, req.body.answer ?? '');
    const completion = valid && req.user.role === 'student'
      ? await campaignPuzzleService.completeForSquad(req.params.did, req.params.puzzleId, req.user.id)
      : null;
    res.json({ valid, completion });
  } catch (err) { next(err); }
}

async function getCompletion(req, res, next) {
  try { res.json(await campaignPuzzleService.getSquadCompletion(req.params.did, req.user.id)); }
  catch (err) { next(err); }
}

module.exports = { listPuzzles, createPuzzle, updatePuzzle, deletePuzzle, reorderPuzzles, verifyPuzzle, getCompletion };
