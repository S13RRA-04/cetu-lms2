'use strict';

// Generic "squad members editing shared named fields live" WebSocket server —
// per-field claim/release locking, live keystroke broadcast, periodic lock
// snapshot reconciliation. Extracted from squadChallengeSocket.js once a
// second real consumer (squadTimelineSocket.js) needed the identical
// mechanics with different join authorization (no assignment involved).
// Callers own resource-specific concerns (auth, room naming, REST
// persistence) — this module only ever sees an opaque `room` string and
// `field` string, never an assignment/timeline/etc.

const { randomUUID } = require('node:crypto');
const { WebSocket, WebSocketServer } = require('ws');
const logger = require('../utils/logger');

const AUTH_TIMEOUT_MS = 5000;
const SNAPSHOT_INTERVAL_MS = 3000;
const MAX_FIELD_LENGTH = 64;
const MAX_VALUE_LENGTH = 100000;

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(payload)); } catch { /* socket closed between check and send */ }
  }
}

// options: { wsPath, coordinator, ownsCoordinator, authenticate, authorizeJoin }
// authorizeJoin(user, joinMessage) must resolve to { room }, or throw/reject.
async function attachSquadFieldSocket(httpServer, options) {
  const { wsPath, coordinator, ownsCoordinator, authenticate, authorizeJoin } = options;
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
    if (url.pathname !== wsPath) return;
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
        logger.warn(`[squadFieldSocket:${wsPath}] message rejected`, { error: error.message, userId: ws.__user?.id });
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
      catch (error) { logger.warn(`[squadFieldSocket:${wsPath}] lock reconciliation failed`, { error: error.message }); }
    }
  }, SNAPSHOT_INTERVAL_MS);
  snapshotTimer.unref();

  wss.on('close', () => {
    clearInterval(snapshotTimer);
    unsubscribe();
    if (ownsCoordinator) coordinator.close().catch(() => {});
  });

  logger.info(`[squadFieldSocket] attached at ${wsPath}`);
  return wss;
}

module.exports = {
  attachSquadFieldSocket,
  AUTH_TIMEOUT_MS,
  SNAPSHOT_INTERVAL_MS,
  MAX_FIELD_LENGTH,
  MAX_VALUE_LENGTH,
};
