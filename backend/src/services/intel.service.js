'use strict';
const { IntelBoard, Enrollment } = require('../models');

async function getOrCreateBoard(courseId, userId) {
  const enroll = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  const squadId = enroll?.squad_id ?? null;
  if (!squadId) return null; // no squad — caller handles this

  const [board] = await IntelBoard.findOrCreate({
    where:    { squad_id: squadId, course_id: courseId },
    defaults: { nodes: [], edges: [], notes: '', last_saved_by: userId },
  });
  return board;
}

async function saveBoard(courseId, userId, { nodes, edges, notes }) {
  const enroll = await Enrollment.findOne({ where: { user_id: userId, course_id: courseId } });
  const squadId = enroll?.squad_id ?? null;
  if (!squadId) return null;

  const [board] = await IntelBoard.findOrCreate({
    where:    { squad_id: squadId, course_id: courseId },
    defaults: { nodes, edges, notes: notes ?? '', last_saved_by: userId },
  });
  await board.update({ nodes, edges, notes: notes ?? board.notes, last_saved_by: userId });
  return board;
}

// Admin: view any squad's board
async function getBoardBySquad(courseId, squadId) {
  return IntelBoard.findOne({ where: { squad_id: squadId, course_id: courseId } })
    ?? { nodes: [], edges: [], notes: '' };
}

module.exports = { getOrCreateBoard, saveBoard, getBoardBySquad };
