'use strict';

const { WebSocket, WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { User, Enrollment } = require('../models');
const logger = require('../utils/logger');
const { createWheelBroadcaster } = require('./wheelBroadcast');

const WS_PATH = '/ws/grand-jury-wheel';
const AUTH_TIMEOUT_MS = 5000;

let _publish = null;

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

async function defaultAuthorizeJoin(user, { squadId }) {
  if (!squadId) throw new Error('squadId is required');
  const enrollment = await Enrollment.findOne({ where: { user_id: user.id, squad_id: squadId, status: 'active' } });
  if (!enrollment) throw new Error('Not a member of this squad');
  return { room: String(squadId) };
}

async function attachGrandJuryWheelSocket(httpServer, options = {}) {
  const broadcaster = options.broadcaster ?? await createWheelBroadcaster({ logger });
  const authenticate = options.authenticate ?? defaultAuthenticate;
  const authorizeJoin = options.authorizeJoin ?? defaultAuthorizeJoin;
  const ownsBroadcaster = !options.broadcaster;
  const rooms = new Map();
  const wss = new WebSocketServer({ noServer: true });

  const broadcastToRoom = (room, payload) => {
    for (const ws of rooms.get(room) ?? []) send(ws, payload);
  };
  const unsubscribe = broadcaster.subscribe(({ room, payload }) => broadcastToRoom(room, payload));

  httpServer.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
    if (url.pathname !== WS_PATH) return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
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
          send(ws, { type: 'authed' });
          return;
        }

        if (msg.type === 'join') {
          if (ws.__room) return send(ws, { type: 'error', message: 'Already joined' });
          const { room } = await authorizeJoin(ws.__user, msg);
          ws.__room = room;
          if (!rooms.has(room)) rooms.set(room, new Set());
          rooms.get(room).add(ws);
          send(ws, { type: 'joined' });
          return;
        }
        // 'ping' and any other post-join message: no-op, just keeps the connection alive.
      } catch (error) {
        if (!ws.__authed) return ws.close(4003, 'Auth failed');
        logger.warn('[grandJuryWheelSocket] message rejected', { error: error.message, userId: ws.__user?.id });
        send(ws, { type: 'error', message: error.message });
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      if (ws.__room) {
        const sockets = rooms.get(ws.__room);
        sockets?.delete(ws);
        if (sockets?.size === 0) rooms.delete(ws.__room);
      }
    });
    ws.on('error', () => {});
  });

  wss.on('close', () => {
    unsubscribe();
    if (ownsBroadcaster) broadcaster.close().catch(() => {});
  });

  _publish = (squadId, payload) => broadcaster.publish(String(squadId), payload);

  logger.info(`[grandJuryWheelSocket] attached at ${WS_PATH}`);
  return wss;
}

function announceWheelWinner(squadId, { userId, name }) {
  if (!_publish) throw new Error('Grand jury wheel socket not attached');
  _publish(squadId, { type: 'winner', userId, name });
}

module.exports = { attachGrandJuryWheelSocket, announceWheelWinner };
