'use strict';

/**
 * Case File — pure, case-agnostic rules engine for the cooperative
 * investigation game (see project docs: Player Rulebook + Facilitator &
 * Case Author's Guide, an original game design — not a third-party
 * property). Deliberately knows nothing about any specific case's card
 * text, Grand Jury rubric, or Case-Defining Development criteria — the
 * physical rulebook treats all of that as facilitator judgment, not an
 * automated check, so this engine only enforces the generic mechanics
 * (token math, the Investigation Results dice table, queue countdown,
 * Command Pressure, Consolidate/Professional Judgment caps). The
 * facilitator's client supplies opaque card IDs (drawn from their own
 * locally-bundled case data) and judgment-call flags (caseDefining,
 * grand jury success, corroboration immunity) as action parameters.
 *
 * This means the coordinator never needs to import case content, and
 * players never receive anything but IDs/categories/numbers — the actual
 * reveal/rubric text simply never exists on the server or over the wire.
 *
 * Exported as a factory (`createCaseFileCoordinator`) so it can be
 * unit-tested directly, the same way `squadLockCoordinator.js` and
 * `wheelBroadcast.js` are structured — pure state transitions, no
 * WebSocket/network code in this file at all.
 */

const CATEGORIES = ['interviews', 'documents', 'digital', 'physical', 'financial', 'intelligence'];
const PRESSURE_LEVELS = ['green', 'yellow', 'orange', 'red', 'black'];
const PRESSURE_MODIFIER = { green: 0, yellow: -1, orange: -2, red: -3, black: -4 };
const CONSOLIDATE_CAP_DEFAULT = 8;

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollDie(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

/** Investigation Results table from the Rulebook. Returns the outcome band + what it draws. */
function classifyRoll(nat) {
  if (nat === 20) return { band: 'critical_success', extraCard: true, positiveInject: true, refundToken: true, bonusCardStrength: 3 };
  if (nat >= 16) return { band: 'opportunity', positiveInject: true };
  if (nat >= 11) return { band: 'success' };
  if (nat >= 6) return { band: 'partial_success', categoryDie: true };
  if (nat >= 2) return { band: 'complication', negativeInjects: 1 };
  return { band: 'major_complication', negativeInjects: 2 };
}

function freshTokens() {
  const t = {};
  for (const c of CATEGORIES) t[c] = 1;
  return t;
}

function createCaseFileCoordinator() {
  /** @type {Map<string, object>} */
  const sessions = new Map();
  const listeners = new Set();

  function publish(code, payload) {
    for (const fn of listeners) fn({ code, payload });
  }

  function requireSession(code) {
    const session = sessions.get(code);
    if (!session) throw new Error('Session not found or has ended');
    return session;
  }

  function publicState(session) {
    // Every field here is safe for players — IDs/categories/counts only,
    // never card text. Facilitator receives this exact same object too;
    // the only asymmetry is which case-content file each client's own
    // bundle can look card IDs up against.
    return {
      code: session.code,
      round: session.round,
      caseStrength: session.caseStrength,
      commandPressure: session.commandPressure,
      consolidateRemaining: session.consolidateRemaining,
      consolidateCap: session.consolidateCap,
      professionalJudgmentUsed: session.professionalJudgmentUsed,
      tokens: session.tokens,
      resolvedEvidence: session.resolvedEvidence,
      pendingReturns: session.pendingReturns,
      indicted: session.indicted,
      gameOver: session.gameOver,
      outcome: session.outcome,
      deckCounts: Object.fromEntries(CATEGORIES.map((c) => [c, session.decks[c].length])),
      positiveInjectRemaining: session.positiveInjectDeck.length,
      negativeInjectRemaining: session.negativeInjectDeck.length,
      defenseCounterplayRemaining: session.defenseCounterplayDeck.length,
      log: session.log.slice(-20),
      playerRoster: session.playerRoster,
      // Whoever gets to arm a category and roll Investigate this round —
      // rotates through joined players in join order, one per round. Null
      // until at least one player has joined; the facilitator can always
      // act regardless of whose turn it is (sole-authority backstop).
      activePlayerId: session.playerRoster.length
        ? session.playerRoster[(session.round - 1) % session.playerRoster.length].userId
        : null,
    };
  }

  function pushLog(session, text) {
    session.log.push({ round: session.round, text });
  }

  function checkGameOver(session) {
    if (session.gameOver) return;
    // Win takes priority: a team that spends its last token on the very
    // action that pushes Case Strength to 30 has still won, not lost.
    if (session.caseStrength >= 30 && session.indicted) {
      session.gameOver = true;
      session.outcome = 'win';
      pushLog(session, 'Case Strength reached 30 post-indictment — investigation successful.');
      return;
    }
    const totalTokens = CATEGORIES.reduce((s, c) => s + session.tokens[c], 0);
    if (totalTokens === 0) {
      session.gameOver = true;
      session.outcome = 'loss';
      pushLog(session, 'Investigation failed — no Resource Tokens remaining.');
    }
  }

  /**
   * facilitatorAuth: opaque owner id string the socket layer assigns —
   * stored so a reconnecting facilitator socket can be recognized, but
   * this module never inspects it beyond equality checks.
   */
  function createSession({ decks, positiveInjectIds, negativeInjectIds, defenseCounterplayIds, consolidateCap }, facilitatorOwnerId) {
    let code;
    do { code = makeCode(); } while (sessions.has(code));

    const shuffledDecks = {};
    for (const cat of CATEGORIES) shuffledDecks[cat] = shuffle(decks?.[cat] ?? []);

    const session = {
      code,
      facilitatorOwnerId,
      round: 1,
      caseStrength: 0,
      commandPressure: 'green',
      consolidateRemaining: consolidateCap ?? CONSOLIDATE_CAP_DEFAULT,
      consolidateCap: consolidateCap ?? CONSOLIDATE_CAP_DEFAULT,
      professionalJudgmentUsed: false,
      tokens: freshTokens(),
      decks: shuffledDecks,
      positiveInjectDeck: shuffle(positiveInjectIds ?? []),
      negativeInjectDeck: shuffle(negativeInjectIds ?? []),
      defenseCounterplayDeck: shuffle(defenseCounterplayIds ?? []),
      resolvedEvidence: [],
      pendingReturns: [],
      indicted: false,
      gameOver: false,
      outcome: null,
      log: [],
      lastRollWasProfessionalJudgment: false,
      playerRoster: [],
    };
    sessions.set(code, session);
    pushLog(session, 'Investigation opened.');
    return { code, state: publicState(session) };
  }

  function endSession(code) {
    sessions.delete(code);
    publish(code, { type: 'ended' });
  }

  function getState(code) {
    return publicState(requireSession(code));
  }

  /**
   * A player joining a session — adds them to the turn-rotation roster (in
   * join order) the first time they connect. Reconnects are idempotent: an
   * already-known userId keeps its existing rotation slot rather than
   * appending a duplicate.
   */
  function joinPlayer({ code, userId, name }) {
    const session = requireSession(code);
    if (!session.playerRoster.some((p) => p.userId === userId)) {
      session.playerRoster.push({ userId, name });
      pushLog(session, `${name} joined as a player.`);
    }
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return state;
  }

  function drawCard(session, category) {
    const deck = session.decks[category];
    if (!deck || deck.length === 0) return null;
    return deck.shift();
  }

  function investigate({ code, category, actionType }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!CATEGORIES.includes(category)) throw new Error('Unknown evidence category');
    if (session.tokens[category] <= 0) throw new Error(`No ${category} tokens remaining`);

    session.tokens[category] -= 1;
    const nat = rollDie(20);
    const modified = nat === 20 ? 20 : Math.max(1, nat + PRESSURE_MODIFIER[session.commandPressure]);
    const outcome = classifyRoll(nat === 20 ? 20 : modified);

    const drawn = [];
    const injects = [];
    let categoryDieRoll = null;

    if (actionType === 'investigate') {
      if (outcome.extraCard) {
        // Critical Success: the chosen category's card PLUS a Category Die bonus card.
        const primary = drawCard(session, category);
        if (primary) drawn.push({ cardId: primary, category });
        categoryDieRoll = rollDie(6);
        const dieCategory = CATEGORIES[categoryDieRoll - 1] ?? category;
        const bonus = drawCard(session, dieCategory);
        if (bonus) drawn.push({ cardId: bonus, category: dieCategory });
      } else if (outcome.categoryDie) {
        // Partial Success: a single card from whichever category the Category
        // Die lands on — it replaces the chosen category's draw, not adds to it.
        categoryDieRoll = rollDie(6);
        const dieCategory = CATEGORIES[categoryDieRoll - 1] ?? category;
        const card = drawCard(session, dieCategory);
        if (card) drawn.push({ cardId: card, category: dieCategory });
      } else {
        const primary = drawCard(session, category);
        if (primary) drawn.push({ cardId: primary, category });
      }
      for (const d of drawn) {
        session.resolvedEvidence.push({ cardId: d.cardId, category: d.category, tier: 'discovered', caseDefining: false, evidenceValue: 1 });
        session.caseStrength += 1;
      }
      if (outcome.bonusCardStrength) session.caseStrength += outcome.bonusCardStrength - 1; // nat20: +3 total for the primary draw
    }

    if (outcome.positiveInject && session.positiveInjectDeck.length) {
      injects.push({ type: 'positive', cardId: session.positiveInjectDeck.shift() });
    }
    if (outcome.negativeInjects) {
      for (let i = 0; i < outcome.negativeInjects; i++) {
        if (session.indicted && rollDie(20) >= 11 && session.defenseCounterplayDeck.length) {
          injects.push({ type: 'defense_counterplay', cardId: session.defenseCounterplayDeck.shift() });
        } else if (session.negativeInjectDeck.length) {
          injects.push({ type: 'negative', cardId: session.negativeInjectDeck.shift() });
        }
      }
    }
    if (outcome.refundToken) session.tokens[category] += 1;

    pushLog(session, `Investigate (${category}): d20=${nat}${modified !== nat ? ` (${modified} after pressure)` : ''} → ${outcome.band}`);
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state, roll: { nat, modified, band: outcome.band, categoryDieRoll }, drawn, injects };
  }

  function develop({ code, category, cardId, targetTier, delay }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!CATEGORIES.includes(category)) throw new Error('Unknown evidence category');
    if (session.tokens[category] <= 0) throw new Error(`No ${category} tokens remaining`);

    session.tokens[category] -= 1;
    const nat = rollDie(20);
    const modified = nat === 20 ? 20 : Math.max(1, nat + PRESSURE_MODIFIER[session.commandPressure]);
    const outcome = classifyRoll(nat === 20 ? 20 : modified);
    const injects = [];
    let queued = false;

    const advances = ['critical_success', 'opportunity', 'success', 'partial_success'].includes(outcome.band);
    if (advances) {
      session.pendingReturns.push({ cardId, category, targetTier, roundsRemaining: delay, startingRounds: delay });
      queued = true;
    }
    if (outcome.negativeInjects) {
      for (let i = 0; i < outcome.negativeInjects; i++) {
        if (session.indicted && rollDie(20) >= 11 && session.defenseCounterplayDeck.length) {
          injects.push({ type: 'defense_counterplay', cardId: session.defenseCounterplayDeck.shift() });
        } else if (session.negativeInjectDeck.length) {
          injects.push({ type: 'negative', cardId: session.negativeInjectDeck.shift() });
        }
      }
    }
    if (outcome.positiveInject && session.positiveInjectDeck.length) {
      injects.push({ type: 'positive', cardId: session.positiveInjectDeck.shift() });
    }
    if (outcome.refundToken) session.tokens[category] += 1;

    pushLog(session, `Develop ${cardId} → ${targetTier} (${category}): d20=${nat} → ${outcome.band}${queued ? ', queued' : ', not advanced'}`);
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state, roll: { nat, modified, band: outcome.band }, queued, injects };
  }

  function markCaseDefining({ code, cardId }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    const entry = session.resolvedEvidence.find((e) => e.cardId === cardId);
    if (!entry) throw new Error('Card not found among resolved evidence');
    if (entry.caseDefining) return { state: publicState(session) };
    entry.caseDefining = true;
    session.caseStrength += 4;
    pushLog(session, `${cardId} marked Case-Defining (+4 Case Strength).`);
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  function consolidate({ code, category }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!CATEGORIES.includes(category)) throw new Error('Unknown evidence category');
    if (session.consolidateRemaining <= 0) throw new Error('Consolidate the Case has been exhausted');
    session.consolidateRemaining -= 1;
    session.tokens[category] += 1;
    pushLog(session, `Consolidated the Case — recovered 1 ${category} token (${session.consolidateRemaining} uses left).`);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  function useProfessionalJudgment({ code }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (session.professionalJudgmentUsed) throw new Error('Professional Judgment already used this game');
    session.professionalJudgmentUsed = true;
    pushLog(session, 'Professional Judgment spent — next roll may be rerolled.');
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  function convertTokens({ code, from, to }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!CATEGORIES.includes(from) || !CATEGORIES.includes(to)) throw new Error('Unknown category');
    if (session.tokens[from] < 2) throw new Error(`Not enough ${from} tokens to convert`);
    session.tokens[from] -= 2;
    session.tokens[to] += 1;
    pushLog(session, `Converted 2 ${from} → 1 ${to}.`);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  function setCommandPressure({ code, level }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!PRESSURE_LEVELS.includes(level)) throw new Error('Unknown Command Pressure level');
    session.commandPressure = level;
    pushLog(session, `Command Pressure set to ${level}.`);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  function delayPending({ code, cardId }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    const entry = session.pendingReturns.find((e) => e.cardId === cardId);
    if (!entry) throw new Error('Card not found in Pending Returns Queue');
    entry.roundsRemaining = Math.min(entry.startingRounds, entry.roundsRemaining + 1);
    pushLog(session, `${cardId} delayed in the Pending Returns Queue.`);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  /** Moves a Pending Returns Queue entry into resolvedEvidence at its target tier. */
  function resolveQueueEntry(session, entry) {
    session.resolvedEvidence.push({ cardId: entry.cardId, category: entry.category, tier: entry.targetTier, caseDefining: false, evidenceValue: 1 });
    session.caseStrength += 1;
  }

  function advanceRound({ code }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    session.round += 1;
    const resolved = [];
    for (const entry of session.pendingReturns) entry.roundsRemaining -= 1;
    session.pendingReturns = session.pendingReturns.filter((entry) => {
      if (entry.roundsRemaining > 0) return true;
      resolveQueueEntry(session, entry);
      resolved.push(entry.cardId);
      return false;
    });
    if (resolved.length) pushLog(session, `Round ${session.round}: resolved from queue — ${resolved.join(', ')}.`);
    else pushLog(session, `Round ${session.round} begins.`);
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state, resolved };
  }

  function presentGrandJury({ code, success, penaltyNote }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (success) {
      session.indicted = true;
      session.caseStrength = Math.max(session.caseStrength, 21);
      pushLog(session, 'Grand Jury presentation succeeded — indictment secured.');
    } else {
      pushLog(session, `Grand Jury presentation fell short.${penaltyNote ? ` ${penaltyNote}` : ''}`);
    }
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  function applyDefenseCounterplay({ code, cardId, immune, tokenPenalty }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!immune && tokenPenalty && CATEGORIES.includes(tokenPenalty.category)) {
      session.tokens[tokenPenalty.category] = Math.max(0, session.tokens[tokenPenalty.category] - (tokenPenalty.amount ?? 1));
    }
    pushLog(session, `${cardId}: Defense Counterplay ${immune ? 'resisted by corroboration' : 'applied'}.`);
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  /** Positive Inject — Momentum band: recover 1 Resource Token, no Consolidate cap cost. */
  function recoverToken({ code, category }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!CATEGORIES.includes(category)) throw new Error('Unknown evidence category');
    session.tokens[category] += 1;
    pushLog(session, `Momentum inject — recovered 1 ${category} token.`);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  /** Positive Inject — Lead band: draw 1 bonus Evidence Card from a chosen category, no roll/token cost. */
  function drawBonusCard({ code, category }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!CATEGORIES.includes(category)) throw new Error('Unknown evidence category');
    const cardId = drawCard(session, category);
    if (cardId) {
      session.resolvedEvidence.push({ cardId, category, tier: 'discovered', caseDefining: false, evidenceValue: 1 });
      session.caseStrength += 1;
      pushLog(session, `Lead inject — bonus card drawn from ${category}.`);
    } else {
      pushLog(session, `Lead inject — ${category} deck was empty, no bonus card drawn.`);
    }
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state, cardId };
  }

  /** Positive Inject — Expedite band: advance 1 queued card one additional space (may resolve it immediately). */
  function expeditePending({ code, cardId }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    const entry = session.pendingReturns.find((e) => e.cardId === cardId);
    if (!entry) throw new Error('Card not found in Pending Returns Queue');
    entry.roundsRemaining -= 1;
    let resolved = false;
    if (entry.roundsRemaining <= 0) {
      resolveQueueEntry(session, entry);
      session.pendingReturns = session.pendingReturns.filter((e) => e !== entry);
      resolved = true;
    }
    pushLog(session, `Expedite inject — ${cardId} advanced${resolved ? ' and resolved' : ' in the queue'}.`);
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state, resolved };
  }

  /** Negative Inject — Setback band: lose 1 Resource Token (facilitator/team picks the category). */
  function loseToken({ code, category }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    if (!CATEGORIES.includes(category)) throw new Error('Unknown evidence category');
    session.tokens[category] = Math.max(0, session.tokens[category] - 1);
    pushLog(session, `Setback inject — lost 1 ${category} token.`);
    checkGameOver(session);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  /** Negative Inject — Suppression band: reduce a resolved card's Evidence Value by 1 (floor 0). */
  function suppressEvidence({ code, cardId }) {
    const session = requireSession(code);
    if (session.gameOver) throw new Error('Investigation has ended');
    const entry = session.resolvedEvidence.find((e) => e.cardId === cardId && (e.evidenceValue ?? 0) > 0);
    if (!entry) {
      // Already suppressed to floor (or card not found) — per the Inject
      // Deck reference, treat this as narrative-only, not an error.
      pushLog(session, `Suppression inject — ${cardId} has no further Evidence Value to reduce.`);
      const state = publicState(session);
      publish(code, { type: 'state', state });
      return { state, suppressed: false };
    }
    entry.evidenceValue -= 1;
    session.caseStrength = Math.max(0, session.caseStrength - 1);
    pushLog(session, `Suppression inject — ${cardId}'s Evidence Value reduced by 1.`);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state, suppressed: true };
  }

  function declareOutcome({ code, outcome }) {
    const session = requireSession(code);
    session.gameOver = true;
    session.outcome = outcome;
    pushLog(session, `Facilitator declared the investigation a ${outcome === 'win' ? 'win' : 'loss'}.`);
    const state = publicState(session);
    publish(code, { type: 'state', state });
    return { state };
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    CATEGORIES,
    createSession,
    endSession,
    getState,
    joinPlayer,
    investigate,
    develop,
    markCaseDefining,
    consolidate,
    useProfessionalJudgment,
    convertTokens,
    setCommandPressure,
    delayPending,
    advanceRound,
    presentGrandJury,
    applyDefenseCounterplay,
    recoverToken,
    drawBonusCard,
    expeditePending,
    loseToken,
    suppressEvidence,
    declareOutcome,
    subscribe,
  };
}

module.exports = { createCaseFileCoordinator, CATEGORIES, PRESSURE_LEVELS };
