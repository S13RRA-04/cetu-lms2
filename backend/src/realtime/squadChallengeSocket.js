'use strict';

const { randomUUID } = require('node:crypto');
const { WebSocket, WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { User, Enrollment, Assignment } = require('../models');
const logger = require('../utils/logger');
const { createSquadLockCoordinator } = require('./squadLockCoordinator');

const WS_PATH = '/ws/squad-challenge';
const AUTH_TIMEOUT_MS = 5000;
const SNAPSHOT_INTERVAL_MS = 3000;
const MAX_FIELD_LENGTH = 64;
const MAX_VALUE_LENGTH = 100000;

function roomKey(assignmentId, squadId) {
  return `${assignmentId}:${squadId}`;
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(payload)); } catch { /* socket closed between check and send */ }
  }
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
  if (assignment.grading_mode !== 'squad' && !(assignment.role_filters?.length > 0)) {
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
  const coordinator = options.coordinator ?? await createSquadLockCoordinator({ logger });
  const authenticate = options.authenticate ?? defaultAuthenticate;
  const authorizeJoin = options.authorizeJoin ?? defaultAuthorizeJoin;
  const ownsCoordinator = !options.coordinator;
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true });

  const broadcast = (room, payload, excludeOwnerId) => {
    for (const ws of rooms.get(room) ?? []) {
      if (ws.__ownerId !== excludeOwnerId) send(ws, payload);
    }
  };
  const unsubscribe = coordinator.subscribe(({ room, payload, excludeOwnerId }) => {
    broadcast(room, payload, excludeOwnerId);
  });

  httpServer.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
    if (url.pathname !== WS_PATH) return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
    ws.__ownerId = randomUUID();
    ws.__fields = new Set();
    ws.__authed = false;
    const authTimer = setTimeout(() => {
      if (!ws.__authed) ws.close(4001, 'Auth timeout');
    }, AUTH_TIMEOUT_MS);

    ws.on('message', async (raw) => {
      try {
        let msg;
        try { msg = JSON.parse(raw); } catch { ws.close(4002, 'Invalid message'); return; }
        if (!ws.__authed) {
          if (msg?.type !== 'auth' || !msg.token) return;
          const user = await authenticate(msg.token);
          clearTimeout(authTimer);
          ws.__authed = true;
          ws.__user = user;
          ws.__userName = `${user.first_name} ${user.last_name}`.trim() || 'Squadmate';
          send(ws, { type: 'authed' });
          return;
        }

        if (msg.type === 'join') {
          if (ws.__room) return send(ws, { type: 'error', message: 'Already joined' });
          const { room } = await authorizeJoin(ws.__user, msg);
          ws.__room = room;
          if (!rooms.has(room)) rooms.set(room, new Set());
          rooms.get(room).add(ws);
          send(ws, { type: 'joined', fieldLocks: await coordinator.snapshot(room) });
          return;
        }
        if (!ws.__room) return;

        if (msg.type === 'ping') {
          await Promise.all([...ws.__fields].map((heldField) => coordinator.refresh(ws.__room, heldField, ws.__ownerId)));
          return;
        }

        const field = typeof msg.field === 'string' ? msg.field : '';
        if (field.length > MAX_FIELD_LENGTH || !field) return;
        const owner = { ownerId: ws.__ownerId, userId: ws.__user.id, name: ws.__userName };
        if (msg.type === 'claim') {
          await coordinator.claim(ws.__room, field, owner);
          ws.__fields.add(field);
        } else if (msg.type === 'release') {
          if (await coordinator.release(ws.__room, field, ws.__ownerId)) ws.__fields.delete(field);
        } else if (msg.type === 'input') {
          const value = typeof msg.value === 'string' ? msg.value : '';
          if (value.length > MAX_VALUE_LENGTH) return send(ws, { type: 'rejected', field, reason: 'Field value is too large' });
          if (!(await coordinator.publishInput(ws.__room, field, value, owner))) {
            send(ws, { type: 'rejected', field, reason: 'Field is not controlled by this client' });
          }
        }
      } catch (error) {
        if (!ws.__authed) return ws.close(4003, 'Auth failed');
        logger.warn('[squadChallengeSocket] message rejected', { error: error.message, userId: ws.__user?.id });
        send(ws, { type: 'error', message: error.message });
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      if (ws.__room) {
        for (const field of ws.__fields) coordinator.release(ws.__room, field, ws.__ownerId).catch(() => {});
        const sockets = rooms.get(ws.__room);
        sockets?.delete(ws);
        if (sockets?.size === 0) rooms.delete(ws.__room);
      }
    });
    ws.on('error', () => {});
  });

  const snapshotTimer = setInterval(async () => {
    for (const room of rooms.keys()) {
      try { broadcast(room, { type: 'locks', fieldLocks: await coordinator.snapshot(room) }); }
      catch (error) { logger.warn('[squadChallengeSocket] lock reconciliation failed', { error: error.message }); }
    }
  }, SNAPSHOT_INTERVAL_MS);
  snapshotTimer.unref();

  wss.on('close', () => {
    clearInterval(snapshotTimer);
    unsubscribe();
    if (ownsCoordinator) coordinator.close().catch(() => {});
  });

  logger.info(`[squadChallengeSocket] attached at ${WS_PATH}`);
  return wss;
}

module.exports = { attachSquadChallengeSocket };
