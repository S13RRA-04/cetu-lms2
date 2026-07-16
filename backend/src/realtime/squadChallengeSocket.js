'use strict';
/**
 * Live squad co-editing for manual-entry ("squad") challenge fields.
 *
 * This layer is purely a live-view + take-control-lock arbitration layer on
 * top of the existing REST persistence path (assignment.controller ->
 * squadChallengeState.service.js -> SquadChallengeState). It does not read
 * or write that table — the client still saves through the existing
 * debounced saveSquadChallengeState() call for durability. If a socket
 * drops, the app falls back to the existing (already-fixed) REST poll in
 * ChallengeFlow.jsx, so nothing here can lose data, only live-view fidelity.
 *
 * Single Render instance (see render.yaml — one `type: web`, no autoscaling),
 * so in-memory room/lock state is sufficient; no cross-instance pub-sub.
 */

const { WebSocket, WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { User, Enrollment, Assignment } = require('../models');
const logger = require('../utils/logger');

const WS_PATH = '/ws/squad-challenge';
const AUTH_TIMEOUT_MS = 5000;
const CLAIM_TTL_MS = 8000;
const SWEEP_INTERVAL_MS = 3000;
const MAX_FIELD_LENGTH = 64;
const MAX_VALUE_LENGTH = 100000;

/** roomKey -> Set<ws> */
const rooms = new Map();
/** roomKey -> Map<field, { userId, name, socket, expiresAt }> */
const fieldLocks = new Map();

function roomKey(assignmentId, squadId) {
  return `${assignmentId}:${squadId}`;
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(payload)); } catch { /* socket mid-close, ignore */ }
  }
}

function broadcast(key, payload, exclude) {
  const sockets = rooms.get(key);
  if (!sockets) return;
  for (const ws of sockets) {
    if (ws !== exclude) send(ws, payload);
  }
}

function snapshotLocks(key) {
  const locks = fieldLocks.get(key);
  if (!locks) return {};
  const out = {};
  for (const [field, lock] of locks) {
    out[field] = { user_id: lock.userId, name: lock.name };
  }
  return out;
}

function releaseField(key, field, { owner, silent = false } = {}) {
  const locks = fieldLocks.get(key);
  if (!locks?.has(field)) return;
  if (owner && locks.get(field).socket !== owner) return;
  locks.delete(field);
  if (!silent) broadcast(key, { type: 'released', field });
  if (locks.size === 0) fieldLocks.delete(key);
}

function releaseAllForSocket(ws) {
  if (!ws.__roomKey) return;
  const locks = fieldLocks.get(ws.__roomKey);
  if (!locks) return;
  for (const [field, lock] of [...locks]) {
    if (lock.socket === ws) releaseField(ws.__roomKey, field, { owner: ws });
  }
}

function claimField(ws, field) {
  const key = ws.__roomKey;
  if (!key || typeof field !== 'string' || !field || field.length > MAX_FIELD_LENGTH) return;
  let locks = fieldLocks.get(key);
  if (!locks) { locks = new Map(); fieldLocks.set(key, locks); }

  const existing = locks.get(field);
  const previousUser = existing && existing.socket !== ws ? { user_id: existing.userId, name: existing.name } : null;

  locks.set(field, { userId: ws.__userId, name: ws.__userName, socket: ws, expiresAt: Date.now() + CLAIM_TTL_MS });
  broadcast(key, {
    type: 'claimed',
    field,
    user: { user_id: ws.__userId, name: ws.__userName },
    previousUser,
  });
}

function refreshClaim(ws, field) {
  const locks = fieldLocks.get(ws.__roomKey);
  const lock = locks?.get(field);
  if (lock && lock.socket === ws) lock.expiresAt = Date.now() + CLAIM_TTL_MS;
}

async function verifyToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'cetu-lms' });
  const user = await User.findByPk(payload.sub);
  if (!user || !user.is_active) throw new Error('Invalid or inactive user');
  return user;
}

async function handleJoin(ws, { courseId, assignmentId }) {
  if (!courseId || !assignmentId) return send(ws, { type: 'error', message: 'courseId and assignmentId are required' });

  const assignment = await Assignment.findByPk(assignmentId);
  if (!assignment) return send(ws, { type: 'error', message: 'Assignment not found' });
  if (String(assignment.course_id) !== String(courseId)) {
    return send(ws, { type: 'error', message: 'Assignment does not belong to this course' });
  }
  if (!assignment.is_published) return send(ws, { type: 'error', message: 'Assignment is not published' });
  const sharedChallenge = assignment.grading_mode === 'squad' || (assignment.role_filters?.length ?? 0) > 0;
  if (!sharedChallenge) return send(ws, { type: 'error', message: 'Assignment is not a shared challenge' });

  const filters = Array.isArray(assignment.role_filters) ? assignment.role_filters : [];
  const certifications = Array.isArray(ws.__certifications) ? ws.__certifications : [];
  if (filters.length > 0 && !filters.includes(ws.__professionalRole) && !filters.some((filter) => certifications.includes(filter))) {
    return send(ws, { type: 'error', message: 'Assignment is not available for this role' });
  }

  const enrollment = await Enrollment.findOne({ where: { user_id: ws.__userId, course_id: courseId, status: 'active' } });
  if (!enrollment?.squad_id) return send(ws, { type: 'error', message: 'Not enrolled in a squad for this course' });

  const key = roomKey(assignmentId, enrollment.squad_id);
  ws.__roomKey = key;
  if (!rooms.has(key)) rooms.set(key, new Set());
  rooms.get(key).add(ws);

  send(ws, { type: 'joined', fieldLocks: snapshotLocks(key) });
}

function handleMessage(ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (!msg || typeof msg !== 'object') return;

  if (!ws.__authed) return; // only 'auth' is handled before auth completes, via the caller

  switch (msg.type) {
    case 'join':
      handleJoin(ws, msg).catch((err) => {
        logger.error(`[squadChallengeSocket] join failed: ${err.message}`);
        send(ws, { type: 'error', message: 'Join failed' });
      });
      break;
    case 'claim':
      if (ws.__roomKey && typeof msg.field === 'string') claimField(ws, msg.field);
      break;
    case 'release':
      if (ws.__roomKey && typeof msg.field === 'string') releaseField(ws.__roomKey, msg.field, { owner: ws });
      break;
    case 'input':
      if (ws.__roomKey && typeof msg.field === 'string' && msg.field.length <= MAX_FIELD_LENGTH) {
        const value = typeof msg.value === 'string' ? msg.value : '';
        const lock = fieldLocks.get(ws.__roomKey)?.get(msg.field);
        if (!lock || lock.socket !== ws) {
          send(ws, { type: 'rejected', field: msg.field, reason: 'Field is not controlled by this client' });
          break;
        }
        if (value.length > MAX_VALUE_LENGTH) {
          send(ws, { type: 'rejected', field: msg.field, reason: 'Field value is too large' });
          break;
        }
        refreshClaim(ws, msg.field);
        broadcast(ws.__roomKey, {
          type: 'input',
          field: msg.field,
          value,
          user: { user_id: ws.__userId, name: ws.__userName },
        }, ws);
      }
      break;
    case 'ping':
      if (ws.__roomKey) {
        // Refresh every field this socket currently holds — a plain
        // heartbeat with no per-field 'input' traffic (e.g. reading, not
        // typing) shouldn't let the claim silently expire out from under it.
        const locks = fieldLocks.get(ws.__roomKey);
        if (locks) for (const [field, lock] of locks) if (lock.socket === ws) refreshClaim(ws, field);
      }
      break;
    default:
      break;
  }
}

function attachSquadChallengeSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
    if (url.pathname !== WS_PATH) return; // let other upgrade handlers (if any) take it

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws) => {
    ws.__authed = false;
    const authTimer = setTimeout(() => {
      if (!ws.__authed) ws.close(4001, 'Auth timeout');
    }, AUTH_TIMEOUT_MS);

    ws.on('message', (raw) => {
      if (!ws.__authed) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return ws.close(4002, 'Invalid auth message'); }
        if (msg?.type !== 'auth' || !msg.token) return; // wait for a proper auth message
        verifyToken(msg.token)
          .then((user) => {
            clearTimeout(authTimer);
            ws.__authed = true;
            ws.__userId = user.id;
            ws.__userName = `${user.first_name} ${user.last_name}`.trim() || 'Squadmate';
            ws.__professionalRole = user.professional_role;
            ws.__certifications = user.certifications;
            send(ws, { type: 'authed' });
          })
          .catch(() => ws.close(4003, 'Auth failed'));
        return;
      }
      handleMessage(ws, raw);
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      releaseAllForSocket(ws);
      if (ws.__roomKey) {
        const room = rooms.get(ws.__roomKey);
        room?.delete(ws);
        if (room?.size === 0) rooms.delete(ws.__roomKey);
      }
    });

    ws.on('error', () => { /* 'close' fires next; cleanup happens there */ });
  });

  setInterval(() => {
    const now = Date.now();
    for (const [key, locks] of fieldLocks) {
      for (const [field, lock] of [...locks]) {
        if (lock.expiresAt <= now) releaseField(key, field, { owner: lock.socket });
      }
    }
  }, SWEEP_INTERVAL_MS).unref();

  logger.info(`[squadChallengeSocket] attached at ${WS_PATH}`);
  return wss;
}

module.exports = { attachSquadChallengeSocket };
