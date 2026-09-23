'use strict';
const { CaseTimeline, Enrollment, User } = require('../models');
const { ForbiddenError } = require('../utils/errors');
const { mergeManualState } = require('./squadChallengeState.service');

const EMPTY_STATE = { manual: { answers: {}, field_meta: {}, typing: {} } };

async function _resolveSquadId(courseId, userId) {
  const enrollment = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  return enrollment?.squad_id ?? null;
}

// Prunes expired "who's typing" presence on read, same as
// squadChallengeState.service.js's getState — otherwise a presence marker
// left by a squadmate who closed the tab mid-keystroke (no `release`/`input`
// ever arrives) would linger until someone else happens to save.
function _pruneTyping(row) {
  const state = row.state ?? EMPTY_STATE;
  if (!state.manual?.typing) return state;
  const pruned = mergeManualState(state, { manual: {} }, { id: '', first_name: '', last_name: '' });
  return pruned;
}

async function getTimeline(courseId, userId) {
  const squadId = await _resolveSquadId(courseId, userId);
  if (!squadId) return null; // no squad — caller (controller) reports 404, same as Intel Board

  const [row] = await CaseTimeline.findOrCreate({
    where:    { squad_id: squadId, course_id: courseId },
    defaults: { state: EMPTY_STATE },
  });
  const pruned = _pruneTyping(row);
  if (JSON.stringify(pruned) !== JSON.stringify(row.state)) await row.update({ state: pruned });
  return pruned;
}

async function saveTimeline(courseId, userId, incomingState) {
  const squadId = await _resolveSquadId(courseId, userId);
  if (!squadId) throw new ForbiddenError('You are not assigned to a squad');

  const user = await User.findByPk(userId, { attributes: ['id', 'first_name', 'last_name'] });
  const [row] = await CaseTimeline.findOrCreate({
    where:    { squad_id: squadId, course_id: courseId },
    defaults: { state: EMPTY_STATE, updated_by: userId },
  });

  const merged = mergeManualState(row.state, incomingState, user);
  await row.update({ state: merged, updated_by: userId });
  return merged;
}

// Admin: view any squad's timeline
async function getTimelineForSquad(courseId, squadId) {
  const row = await CaseTimeline.findOne({ where: { squad_id: squadId, course_id: courseId } });
  if (!row) return EMPTY_STATE;
  return _pruneTyping(row);
}

module.exports = { getTimeline, saveTimeline, getTimelineForSquad };
