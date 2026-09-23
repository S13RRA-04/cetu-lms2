'use strict';

const jwt = require('jsonwebtoken');
const { User, Enrollment } = require('../models');
const logger = require('../utils/logger');
const { createSquadLockCoordinator } = require('./squadLockCoordinator');
const { attachSquadFieldSocket } = require('./squadFieldSocket');

const WS_PATH = '/ws/squad-timeline';

// Unlike the challenge socket's room (assignment + squad), a case timeline is
// standalone — one per squad per course, not tied to any assignment — so the
// room key and join check only ever need courseId + the caller's own squad.
function roomKey(courseId, squadId) {
  return `timeline:${courseId}:${squadId}`;
}

async function defaultAuthenticate(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'cetu-lms' });
  const user = await User.findByPk(payload.sub);
  if (!user || !user.is_active) throw new Error('Invalid or inactive user');
  return user;
}

async function defaultAuthorizeJoin(user, { courseId }) {
  if (!courseId) throw new Error('courseId is required');
  const enrollment = await Enrollment.findOne({ where: { user_id: user.id, course_id: courseId, status: 'active' } });
  if (!enrollment?.squad_id) throw new Error('Not enrolled in a squad for this course');
  return { room: roomKey(courseId, enrollment.squad_id) };
}

async function attachSquadTimelineSocket(httpServer, options = {}) {
  const ownsCoordinator = !options.coordinator;
  const coordinator = options.coordinator ?? await createSquadLockCoordinator({ logger });
  return attachSquadFieldSocket(httpServer, {
    wsPath: WS_PATH,
    coordinator,
    ownsCoordinator,
    authenticate: options.authenticate ?? defaultAuthenticate,
    authorizeJoin: options.authorizeJoin ?? defaultAuthorizeJoin,
  });
}

module.exports = { attachSquadTimelineSocket };
