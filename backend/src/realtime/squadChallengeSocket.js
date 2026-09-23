'use strict';

const jwt = require('jsonwebtoken');
const { User, Enrollment, Assignment } = require('../models');
const logger = require('../utils/logger');
const { createSquadLockCoordinator } = require('./squadLockCoordinator');
const { attachSquadFieldSocket } = require('./squadFieldSocket');

const WS_PATH = '/ws/squad-challenge';

function roomKey(assignmentId, squadId) {
  return `${assignmentId}:${squadId}`;
}

async function defaultAuthenticate(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'cetu-lms' });
  const user = await User.findByPk(payload.sub);
  if (!user || !user.is_active) throw new Error('Invalid or inactive user');
  return user;
}

async function defaultAuthorizeJoin(user, { courseId, assignmentId }) {
  if (!courseId || !assignmentId) throw new Error('courseId and assignmentId are required');
  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) throw new Error('Assignment not found');
  if (String(assignment.course_id) !== String(courseId)) throw new Error('Assignment does not belong to this course');
  if (!assignment.is_published) throw new Error('Assignment is not published');
  if (assignment.grading_mode !== 'squad') {
    throw new Error('Assignment is not a shared challenge');
  }

  const filters = Array.isArray(assignment.role_filters) ? assignment.role_filters : [];
  const certifications = Array.isArray(user.certifications) ? user.certifications : [];
  if (filters.length > 0 && !filters.includes(user.professional_role) && !filters.some((filter) => certifications.includes(filter))) {
    throw new Error('Assignment is not available for this role');
  }

  const enrollment = await Enrollment.findOne({ where: { user_id: user.id, course_id: courseId, status: 'active' } });
  if (!enrollment?.squad_id) throw new Error('Not enrolled in a squad for this course');
  return { room: roomKey(assignmentId, enrollment.squad_id) };
}

async function attachSquadChallengeSocket(httpServer, options = {}) {
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

module.exports = { attachSquadChallengeSocket };
