'use strict';
const intelService = require('../services/intel.service');

async function getBoard(req, res, next) {
  try {
    const board = await intelService.getOrCreateBoard(req.params.id, req.user.id);
    if (!board) return res.status(404).json({ error: 'No squad assigned' });
    res.json(board);
  } catch (err) { next(err); }
}

async function saveBoard(req, res, next) {
  try {
    const board = await intelService.saveBoard(req.params.id, req.user.id, req.body);
    if (!board) return res.status(404).json({ error: 'No squad assigned' });
    res.json(board);
  } catch (err) { next(err); }
}

async function getSquadBoard(req, res, next) {
  try {
    const board = await intelService.getBoardBySquad(req.params.id, req.params.squadId);
    res.json(board);
  } catch (err) { next(err); }
}

module.exports = { getBoard, saveBoard, getSquadBoard };
