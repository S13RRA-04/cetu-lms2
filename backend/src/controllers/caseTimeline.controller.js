'use strict';
const caseTimelineService = require('../services/caseTimeline.service');

async function getTimeline(req, res, next) {
  try {
    const timeline = await caseTimelineService.getTimeline(req.params.id, req.user.id);
    if (!timeline) return res.status(404).json({ error: 'No squad assigned' });
    res.json(timeline);
  } catch (err) { next(err); }
}

async function saveTimeline(req, res, next) {
  try {
    const timeline = await caseTimelineService.saveTimeline(req.params.id, req.user.id, req.body);
    res.json(timeline);
  } catch (err) { next(err); }
}

async function getSquadTimeline(req, res, next) {
  try {
    const timeline = await caseTimelineService.getTimelineForSquad(req.params.id, req.params.squadId);
    res.json(timeline);
  } catch (err) { next(err); }
}

module.exports = { getTimeline, saveTimeline, getSquadTimeline };
