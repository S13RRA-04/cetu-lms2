'use strict';

const { WebSocket, WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');
const { createCaseFileCoordinator } = require('./caseFileCoordinator');

const WS_PATH = '/ws/case-file';
const AUTH_TIMEOUT_MS = 5000;
const FACILITATOR_ROLES = new Set(['admin', 'instructor', 'superadmin']);

// Player-permitted actions, split by how they're gated (see the dispatcher
// below for the full rationale). Everything else in FACILITATOR_ACTIONS
// stays facilitator-only.
const PLAYER_TURN_ACTIONS = new Set(['investigate', 'roll_category_die']);
const PLAYER_OPEN_ACTIONS = new Set(['recover_token', 'lose_token']);

// Every action's handler, keyed by name. The coordinator method of the same
// name is called with the parsed message (minus `type`/`action`).
const FACILITATOR_ACTIONS = {
  investigate: (c, msg) => c.investigate(msg),
  roll_category_die: (c, msg) => c.rollCategoryDie(msg),
  develop: (c, msg) => c.develop(msg),
  mark_case_defining: (c, msg) => c.markCaseDefining(msg),
  consolidate: (c, msg) => c.consolidate(msg),
  use_professional_judgment: (c, msg) => c.useProfessionalJudgment(msg),
  convert_tokens: (c, msg) => c.convertTokens(msg),
  set_command_pressure: (c, msg) => c.setCommandPressure(msg),
  delay_pending: (c, msg) => c.delayPending(msg),
  advance_round: (c, msg) => c.advanceRound(msg),
  present_grand_jury: (c, msg) => c.presentGrandJury(msg),
  apply_defense_counterplay: (c, msg) => c.applyDefenseCounterplay(msg),
  recover_token: (c, msg) => c.recoverToken(msg),
  draw_bonus_card: (c, msg) => c.drawBonusCard(msg),
  expedite_pending: (c, msg) => c.expeditePending(msg),
  lose_token: (c, msg) => c.loseToken(msg),
  suppress_evidence: (c, msg) => c.suppressEvidence(msg),
  declare_outcome: (c, msg) => c.declareOutcome(msg),
};

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

async function attachCaseFileSocket(httpServer, options = {}) {
  const coordinator = options.coordinator ?? createCaseFileCoordinator();
  const authenticate = options.authenticate ?? defaultAuthenticate;
  const rooms = new Map(); // code -> Set<ws>
  const wss = new WebSocketServer({ noServer: true });

  const broadcastToRoom = (code, payload) => {
    for (const ws of rooms.get(code) ?? []) send(ws, payload);
  };
  const unsubscribe = coordinator.subscribe(({ code, payload }) => broadcastToRoom(code, payload));

  httpServer.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch { socket.destroy(); return; }
    if (url.pathname !== WS_PATH) return;
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', (ws) => {
    ws.__authed = false;
    ws.__role = null;
    ws.__code = null;
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
          if (ws.__code) return send(ws, { type: 'error', message: 'Already joined' });

          if (msg.role === 'facilitator') {
            if (!FACILITATOR_ROLES.has(ws.__user.role)) {
              return send(ws, { type: 'error', message: 'Only instructors/admins can facilitate a session' });
            }
            const { code, state } = coordinator.createSession(
              {
                decks: msg.decks,
                positiveInjectIds: msg.positiveInjectIds,
                negativeInjectIds: msg.negativeInjectIds,
                defenseCounterplayIds: msg.defenseCounterplayIds,
                consolidateCap: msg.consolidateCap,
              },
              ws.__user.id
            );
            ws.__role = 'facilitator';
            ws.__code = code;
            if (!rooms.has(code)) rooms.set(code, new Set());
            rooms.get(code).add(ws);
            send(ws, { type: 'joined', role: 'facilitator', code, state });
            return;
          }

          if (msg.role === 'player') {
            const code = String(msg.code ?? '').trim().toUpperCase();
            const name = `${ws.__user.first_name} ${ws.__user.last_name}`.trim();
            let state;
            try { state = coordinator.joinPlayer({ code, userId: ws.__user.id, name }); }
            catch { return send(ws, { type: 'error', message: 'No active session with that code' }); }
            ws.__role = 'player';
            ws.__code = code;
            if (!rooms.has(code)) rooms.set(code, new Set());
            rooms.get(code).add(ws);
            send(ws, { type: 'joined', role: 'player', code, state });
            return;
          }

          return send(ws, { type: 'error', message: 'role must be "facilitator" or "player"' });
        }

        if (!ws.__code) return;
        if (msg.type === 'ping') return;

        if (msg.type === 'action') {
          // Facilitator: full action set, always.
          //
          // Player: three tiers, matching how much judgment/private info an
          // effect needs —
          //  - Investigate / its follow-up Category Die roll: whoever's turn
          //    it is (see activePlayerId).
          //  - Recover/lose a Resource Token (a Momentum/Setback inject's
          //    effect): just a category choice, which is public info any
          //    player already sees — any connected player, no turn gate.
          //  - Everything else (Develop, marking Case-Defining, Lead/
          //    Expedite/Delay/Suppression injects, Grand Jury, pressure
          //    overrides, ...): facilitator-only, because they hinge on
          //    judgment calls or on card identities a player's client
          //    structurally never receives.
          if (ws.__role === 'player') {
            if (PLAYER_TURN_ACTIONS.has(msg.action)) {
              let current;
              try { current = coordinator.getState(ws.__code); }
              catch (error) { return send(ws, { type: 'error', message: error.message, action: msg.action, requestId: msg.requestId }); }
              if (current.activePlayerId !== ws.__user.id) {
                return send(ws, { type: 'error', message: 'Not your turn.', action: msg.action, requestId: msg.requestId });
              }
            } else if (!PLAYER_OPEN_ACTIONS.has(msg.action)) {
              return send(ws, { type: 'error', message: 'Only the facilitator can take that action', action: msg.action, requestId: msg.requestId });
            }
          } else if (ws.__role !== 'facilitator') {
            return send(ws, { type: 'error', message: 'Only the facilitator can take actions' });
          }

          const handler = FACILITATOR_ACTIONS[msg.action];
          if (!handler) return send(ws, { type: 'error', message: `Unknown action: ${msg.action}` });
          try {
            const result = handler(coordinator, { ...msg.params, code: ws.__code });
            // Broadcast, not unicast: every roll's outcome (including any
            // drawn injects) has to reach the whole room, not just whoever
            // triggered it — the facilitator still has to resolve
            // facilitator-only injects even when a player rolled them, and
            // any player can resolve a Momentum/Setback token inject
            // regardless of who drew it. Nothing here is more sensitive
            // broadcast than unicast — drawn cardIds are already opaque to
            // any client without the bundled case file.
            broadcastToRoom(ws.__code, { type: 'action_result', action: msg.action, requestId: msg.requestId, result });
          } catch (error) {
            send(ws, { type: 'error', message: error.message, action: msg.action, requestId: msg.requestId });
          }
        }
      } catch (error) {
        if (!ws.__authed) return ws.close(4003, 'Auth failed');
        logger.warn('[caseFileSocket] message rejected', { error: error.message, userId: ws.__user?.id });
        send(ws, { type: 'error', message: error.message });
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimer);
      if (ws.__code) {
        const sockets = rooms.get(ws.__code);
        sockets?.delete(ws);
        if (ws.__role === 'facilitator') {
          // The facilitator is the session's sole authority — when they
          // leave, the session ends for everyone (mirrors TTX Facilitator's
          // ephemeral, no-persistence "New Session" model).
          try { coordinator.endSession(ws.__code); } catch { /* already gone */ }
          rooms.delete(ws.__code);
        } else if (sockets?.size === 0) {
          rooms.delete(ws.__code);
        }
      }
    });
    ws.on('error', () => {});
  });

  wss.on('close', () => {
    unsubscribe();
  });

  logger.info(`[caseFileSocket] attached at ${WS_PATH}`);
  return wss;
}

module.exports = { attachCaseFileSocket };
