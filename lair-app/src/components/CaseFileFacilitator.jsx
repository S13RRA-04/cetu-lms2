import { useEffect, useRef, useState } from 'react';
import useCaseFileSession from '../hooks/useCaseFileSession.js';
import { CATEGORY_META, CATEGORIES, BAND_META, PRESSURE_META, PRESSURE_LEVELS, LADDER, NEXT_TIER, TIER_RANK, tierLabel } from '../data/caseFileTheme.js';
import { CASES, getCaseById } from '../data/caseFileCases.js';
import {
  positiveInjectFlavor,
  negativeInjectFlavor,
  buildDeckPayload,
  bandForCaseStrength,
  BAND_THRESHOLDS,
  findCard as findCardUtil,
  findFact as findFactUtil,
  findDefenseCard as findDefenseCardUtil,
  positiveInjectById,
  negativeInjectById,
} from '../data/caseFileCaseUtils.js';
import CaseFileGuide from './CaseFileGuide.jsx';
import { INSTRUCTOR_GUIDE_SECTIONS } from '../data/caseFileGuideContent.js';
import { Die20, Die6 } from './CaseFileDice.jsx';
import CaseFileTourOverlay from './CaseFileTourOverlay.jsx';
import useCaseFileTour from '../hooks/useCaseFileTour.js';
import { FACILITATOR_TOUR_BEATS } from '../data/caseFileTourScript.js';

const ROLL_MIN_MS = 550;
const ROLL6_MIN_MS = 500;

function CaseStrengthTrack({ caseStrength }) {
  const cells = Array.from({ length: 31 }, (_, n) => n);
  const currentBand = bandForCaseStrength(caseStrength);
  return (
    <div className="cf-track-panel" data-tour="case-strength-track">
      <div className="cf-track-title">Case Strength Track</div>
      <div className="cf-track-row">
        {cells.map((n) => {
          const bandKey = bandForCaseStrength(n).key;
          const clampedStrength = Math.min(caseStrength, 30);
          const reached = n <= clampedStrength;
          const isCurrent = n === clampedStrength;
          return (
            <div
              key={n}
              className={`cf-track-cell${reached ? ' cf-track-reached' : ''}${isCurrent ? ' cf-track-current' : ''}`}
              style={{
                background: reached ? BAND_META[bandKey].color : undefined,
                '--cf-marker-color': BAND_META[bandKey].color,
              }}
            >
              {n}
            </div>
          );
        })}
      </div>
      <div className="cf-track-bands">
        {BAND_THRESHOLDS.map((b) => (
          <div
            key={b.key}
            className="cf-track-band"
            style={{
              flex: (Math.min(b.max, 30) - b.min + 1),
              background: b.key === currentBand.key ? `${BAND_META[b.key].color}33` : 'transparent',
              color: b.key === currentBand.key ? BAND_META[b.key].color : undefined,
            }}
          >
            {b.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CaseFileFacilitator() {
  const [realStarted, setStarted] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(CASES[0].id);
  const [session, setSession] = useState(null);
  const activeCase = getCaseById(selectedCaseId).data;
  // Shadow the generic 2-arg utils with case-bound versions so every call
  // site below (findCard(id), findFact(id)) reads unchanged.
  const findCard = (id) => findCardUtil(activeCase, id);
  const findFact = (id) => findFactUtil(activeCase, id);
  const findDefenseCard = (id) => findDefenseCardUtil(activeCase, id);

  // "Learn to Play" — a scripted walkthrough that impersonates
  // useCaseFileSession's return shape (see useCaseFileTour.js) so the real
  // board below renders unmodified whether it's live or touring.
  const tour = useCaseFileTour(FACILITATOR_TOUR_BEATS);

  const live = useCaseFileSession({
    role: 'facilitator',
    session,
    enabled: realStarted && !!session && !tour.active,
  });
  const started = tour.active ? (tour.step?.started ?? true) : realStarted;
  const connected = tour.active ? true : live.connected;
  const code = tour.active ? 'DEMO' : live.code;
  const state = tour.active ? tour.state : live.state;
  const lastResult = tour.active ? tour.lastResult : live.lastResult;
  const error = tour.active ? null : live.error;
  const ended = tour.active ? false : live.ended;
  const sendAction = tour.active ? tour.sendAction : live.sendAction;

  function startTour() {
    setSelectedCaseId('meridian-skim');
    tour.start();
  }

  const [convertFrom, setConvertFrom] = useState('documents');
  const [convertFrom2, setConvertFrom2] = useState('documents');
  const [convertTo, setConvertTo] = useState('financial');
  const [guideOpen, setGuideOpen] = useState(false);
  const [instructorGuideOpen, setInstructorGuideOpen] = useState(false);

  // Investigating a category is now a two-step gesture: click a deck to
  // "arm" it (armedCategory), then click the d20 itself to actually roll —
  // nothing is sent to the server until that explicit roll click.
  const [armedCategory, setArmedCategory] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [rollFace, setRollFace] = useState(null);
  const [rollingCategory, setRollingCategory] = useState(null);
  const [flashPile, setFlashPile] = useState(null);
  const rollTimer = useRef(null);
  const rollStart = useRef(0);
  const pendingRequestId = useRef(null);

  // Beats can request a deck pre-armed (arming is local UI state, not a
  // sendAction call, so the tour can't detect/auto-advance on it itself).
  useEffect(() => {
    if (tour.active && tour.step?.autoArm) setArmedCategory(tour.step.autoArm);
  }, [tour.active, tour.stepIndex]);

  // Category Die (d6) — owed on Partial Success / Critical Success bands.
  // Nothing about it — not even which category — is known until this die
  // is actually rolled: investigate() only reports that one is pending
  // (roll.categoryDiePending); the real roll_category_die action is what
  // resolves and draws the card, exactly like the d20's own roll.
  const [pendingCategoryDie, setPendingCategoryDie] = useState(null); // { bonusCategory? } | null
  const [rollFace6, setRollFace6] = useState(null);
  const [rolling6, setRolling6] = useState(false);
  const roll6Timer = useRef(null);
  const roll6Start = useRef(0);
  const pendingRoll6RequestId = useRef(null);

  // Card-flip choreography: a card renders face-down the instant it appears
  // in resolvedEvidence, then flips face-up on a short stagger — revealedIds
  // persists across renders so a card only ever flips once (tier upgrades
  // later don't re-trigger it).
  const [revealedIds, setRevealedIds] = useState(() => new Set());
  const pendingFlipRef = useRef(new Set());
  const flipTimersRef = useRef([]);

  // "Dealt from deck" flying-card ghost, from the clicked deck tile to the
  // Play Area panel — pure CSS keyframe driven by --dx/--dy deltas computed
  // from real DOM rects at click time.
  const [flyingCards, setFlyingCards] = useState([]);
  const deckElRefs = useRef({});
  const playAreaRef = useRef(null);

  // Pending Inject resolution — a drawn Positive/Negative inject card
  // (see caseFileInjectDecks.js) carries a real mechanical effect, several
  // of which need the facilitator to pick a target (which category, which
  // queued card, which resolved evidence card) before it can be applied.
  // Defense Counterplay draws are excluded here — those stay on the
  // existing "Defense Counterplay Reference" apply-any-card flow below.
  const [pendingInjects, setPendingInjects] = useState([]);
  const seenInjectKeyRef = useRef(new Set());

  useEffect(() => {
    if (ended) setStarted(false);
  }, [ended]);

  useEffect(() => {
    if (!lastResult?.result?.injects?.length || !state) return;
    const additions = [];
    lastResult.result.injects.forEach((inj, i) => {
      const key = `${lastResult.requestId}-${i}-${inj.cardId}`;
      if (seenInjectKeyRef.current.has(key)) return;

      if (inj.type === 'defense_counterplay') {
        // Auto-drawn post-indictment (see caseFileCoordinator.js investigate())
        // — previously the only way to act on one was to hunt it down by hand
        // in the Defense Counterplay Reference list below; surface it here
        // instead, pre-wired to the actual card that was drawn.
        seenInjectKeyRef.current.add(key);
        const card = findDefenseCard(inj.cardId);
        if (!card) return;
        const corroborated = card.corroborationImmune
          ? new Set(state.resolvedEvidence.filter((e) => findCard(e.cardId)?.factId === card.corroborationImmune).map((e) => e.cardId)).size >= 2
          : false;
        additions.push({
          uid: key, type: inj.type, cardId: inj.cardId, effect: 'defense_counterplay',
          title: card.name, flavor: card.effect, band: null, immune: corroborated,
        });
        return;
      }

      if (inj.type !== 'positive' && inj.type !== 'negative') return;
      seenInjectKeyRef.current.add(key);
      const ref = inj.type === 'positive' ? positiveInjectById(inj.cardId) : negativeInjectById(inj.cardId);
      if (!ref) return;
      if (ref.effect === 'reduce_pressure' || ref.effect === 'increase_pressure') {
        // Random band-shift — there's no target to choose, so it applies
        // itself the instant it's drawn rather than waiting on a click.
        const idx = PRESSURE_LEVELS.indexOf(state.commandPressure);
        const delta = ref.effect === 'reduce_pressure' ? -1 : 1;
        const level = PRESSURE_LEVELS[Math.max(0, Math.min(PRESSURE_LEVELS.length - 1, idx + delta))];
        sendAction('set_command_pressure', { level });
        return;
      }
      additions.push({
        uid: key, type: inj.type, cardId: inj.cardId,
        title: ref.title, flavor: ref.flavor, band: ref.band, effect: ref.effect,
        category: CATEGORIES[0], queueCardId: '', evidenceCardId: '',
      });
    });
    if (additions.length) setPendingInjects((prev) => [...prev, ...additions]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult]);

  function updatePendingInject(uid, patch) {
    setPendingInjects((prev) => prev.map((p) => (p.uid === uid ? { ...p, ...patch } : p)));
  }
  function dismissPendingInject(uid) {
    setPendingInjects((prev) => prev.filter((p) => p.uid !== uid));
  }
  // reduce_pressure/increase_pressure never reach here — they're auto-applied
  // the instant they're drawn (see the intake effect above), since there's no
  // target to choose.
  function applyPendingInject(pi) {
    switch (pi.effect) {
      case 'recover_token': sendAction('recover_token', { category: pi.category }); break;
      case 'lose_token': sendAction('lose_token', { category: pi.category }); break;
      case 'bonus_card': sendAction('draw_bonus_card', { category: pi.category }); break;
      case 'expedite_queue': if (pi.queueCardId) sendAction('expedite_pending', { cardId: pi.queueCardId }); break;
      case 'delay_queue': if (pi.queueCardId) sendAction('delay_pending', { cardId: pi.queueCardId }); break;
      case 'suppress_evidence': if (pi.evidenceCardId) sendAction('suppress_evidence', { cardId: pi.evidenceCardId }); break;
      case 'defense_counterplay':
        sendAction('apply_defense_counterplay', { cardId: pi.cardId, immune: pi.immune, tokenPenalty: { category: 'financial', amount: 1 } });
        break;
      default: break;
    }
    dismissPendingInject(pi.uid);
  }

  useEffect(() => () => {
    clearInterval(rollTimer.current);
    clearInterval(roll6Timer.current);
    flipTimersRef.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!state) return;
    const ids = [...new Set(state.resolvedEvidence.map((e) => e.cardId))];
    const newIds = ids.filter((id) => !revealedIds.has(id) && !pendingFlipRef.current.has(id));
    newIds.forEach((id, i) => {
      pendingFlipRef.current.add(id);
      const t = setTimeout(() => setRevealedIds((prev) => new Set(prev).add(id)), 220 + i * 170);
      flipTimersRef.current.push(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state ? state.resolvedEvidence.map((e) => e.cardId).join(',') : '']);

  useEffect(() => {
    if (!rolling || !lastResult || lastResult.requestId !== pendingRequestId.current) return;
    const elapsed = Date.now() - rollStart.current;
    const wait = Math.max(0, ROLL_MIN_MS - elapsed);
    const t = setTimeout(() => {
      clearInterval(rollTimer.current);
      setRollFace(lastResult.result?.roll?.nat ?? null);
      setRolling(false);
      setRollingCategory(null);
      if (lastResult.result?.roll?.categoryDiePending) setPendingCategoryDie({});
      if (lastResult.result?.injects?.length) {
        const kind = lastResult.result.injects[0].type;
        setFlashPile(kind);
        setTimeout(() => setFlashPile(null), 550);
      }
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult, rolling]);

  useEffect(() => {
    if (!rolling6 || !lastResult || lastResult.requestId !== pendingRoll6RequestId.current) return;
    const elapsed = Date.now() - roll6Start.current;
    const wait = Math.max(0, ROLL6_MIN_MS - elapsed);
    const t = setTimeout(() => {
      clearInterval(roll6Timer.current);
      setRollFace6(lastResult.result?.categoryDieRoll ?? null);
      setRolling6(false);
      const bonus = lastResult.result?.drawn?.[0];
      setPendingCategoryDie((prev) => (prev ? { ...prev, bonusCategory: bonus?.category } : prev));
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult, rolling6]);

  function startWithCase() {
    if (tour.active) { tour.next(); return; } // this click is just the tour's spotlight beat — don't open a real session
    setSession(buildDeckPayload(activeCase));
    setStarted(true);
  }

  function newSession() {
    setStarted(false);
    setSession(null);
    setArmedCategory(null);
    setRollFace(null);
    setRollingCategory(null);
    setPendingCategoryDie(null);
    setRollFace6(null);
  }

  function flyCardFromDeck(cat) {
    const deckEl = deckElRefs.current[cat];
    const targetEl = playAreaRef.current;
    if (!deckEl || !targetEl) return;
    const from = deckEl.getBoundingClientRect();
    const to = targetEl.getBoundingClientRect();
    const id = `${cat}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const dx = (to.left + 44) - (from.left + from.width / 2 - 22);
    const dy = (to.top + 44) - (from.top + from.height / 2 - 22);
    setFlyingCards((prev) => [...prev, {
      id,
      left: from.left + from.width / 2 - 22,
      top: from.top + from.height / 2 - 22,
      dx, dy,
      color: CATEGORY_META[cat].color,
    }]);
    setTimeout(() => setFlyingCards((prev) => prev.filter((f) => f.id !== id)), 620);
  }

  /** Step 1: click a deck to arm it — nothing is sent to the server yet. */
  function armCategory(cat) {
    if (rolling || !state || state.tokens[cat] <= 0 || state.gameOver) return;
    setArmedCategory(cat);
    setRollFace(null);
    setPendingCategoryDie(null);
    setRollFace6(null);
  }

  /** Step 2: click the d20 itself to actually roll and commit the action. */
  function rollD20() {
    if (!armedCategory || rolling || !state) return;
    const cat = armedCategory;
    setRolling(true);
    setRollingCategory(cat);
    rollStart.current = Date.now();
    clearInterval(rollTimer.current);
    rollTimer.current = setInterval(() => setRollFace(1 + Math.floor(Math.random() * 20)), 70);
    pendingRequestId.current = sendAction('investigate', { category: cat, actionType: 'investigate' });
    flyCardFromDeck(cat);
    setArmedCategory(null);
  }

  /** Optional 3rd step: click the d6 to actually roll it — this is the real reveal, resolved and drawn server-side only now. */
  function rollD6() {
    if (!pendingCategoryDie || rolling6) return;
    setRolling6(true);
    roll6Start.current = Date.now();
    clearInterval(roll6Timer.current);
    roll6Timer.current = setInterval(() => setRollFace6(1 + Math.floor(Math.random() * 6)), 70);
    pendingRoll6RequestId.current = sendAction('roll_category_die', {});
  }

  if (!started || !state) {
    return (
      <div className="ttx-wrap cf-tabletop">
        <div className="ttx-header">
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Case File — Facilitator</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Choose a case, then start the investigation.</p>
          </div>
          <div className="ttx-session-controls">
            <button className="btn-secondary" onClick={startTour}>Learn to Play</button>
            <button className="btn-secondary" onClick={() => setInstructorGuideOpen(true)}>Instructor Guide</button>
          </div>
        </div>

        <div className="cf-case-picker" data-tour="case-picker">
          {CASES.map(({ id, data }) => (
            <button
              key={id}
              className={`cf-case-card${selectedCaseId === id ? ' cf-case-card-selected' : ''}`}
              onClick={() => { if (!tour.active) setSelectedCaseId(id); }}
            >
              <span className="cf-case-card-category">{data.caseMeta.category}</span>
              <span className="cf-case-card-title">{data.caseMeta.title}</span>
              <span className="cf-case-card-blurb">{data.caseMeta.blurb}</span>
            </button>
          ))}
        </div>

        <div className="ttx-guide" data-tour="premise">
          <p style={{ margin: '0 0 12px' }}>{activeCase.caseMeta.premise}</p>
          <p style={{ margin: '0 0 16px' }}><strong>Initial Complaint:</strong> {activeCase.caseMeta.initialComplaint}</p>
          <button className="btn-primary" data-tour="start-investigation" onClick={startWithCase}>
            {started ? 'Connecting…' : 'Start Investigation'}
          </button>
          {error && <p style={{ color: 'var(--danger)', marginTop: 12 }}>{error}</p>}
        </div>

        {tour.active && <CaseFileTourOverlay tour={tour} />}

        {instructorGuideOpen && (
          <CaseFileGuide title="Instructor Guide" sections={INSTRUCTOR_GUIDE_SECTIONS} onClose={() => setInstructorGuideOpen(false)} />
        )}
      </div>
    );
  }

  const band = bandForCaseStrength(state.caseStrength);
  // A card can appear multiple times in resolvedEvidence (once per ladder
  // tier it advances through) — collapse to one card per id at its highest
  // tier reached, OR-ing caseDefining across duplicates.
  const dedupedEvidence = Object.values(
    state.resolvedEvidence.reduce((acc, e) => {
      const prev = acc[e.cardId];
      if (!prev || TIER_RANK[e.tier] > TIER_RANK[prev.tier]) {
        acc[e.cardId] = { ...e, caseDefining: e.caseDefining || prev?.caseDefining || false };
      } else {
        prev.caseDefining = prev.caseDefining || e.caseDefining;
      }
      return acc;
    }, {})
  );
  const resolvedByFact = activeCase.centralFacts.map((fact) => {
    const cards = dedupedEvidence.filter((e) => findCard(e.cardId)?.factId === fact.id);
    return { fact, cards };
  });
  const citableFacts = resolvedByFact.filter((f) => f.cards.length > 0);
  const uncitableFacts = resolvedByFact.filter((f) => f.cards.length === 0);

  const positiveDrawn = positiveInjectFlavor.length - state.positiveInjectRemaining;
  const negativeDrawn = negativeInjectFlavor.length - state.negativeInjectRemaining;
  const defenseDrawn = activeCase.defenseCounterplayCards.length - state.defenseCounterplayRemaining;

  const queueSlots = state.pendingReturns.length > 0 ? state.pendingReturns : [null, null, null];
  const maxTurn = Math.max(state.round + 3, 12);

  return (
    <div className="ttx-wrap cf-tabletop">
      <div className="ttx-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Case File</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }} data-tour="room-code">
            {activeCase.caseMeta.title} · Room Code: <strong style={{ color: 'var(--primary)' }}>{code}</strong> · {connected ? 'Connected' : 'Reconnecting…'}
          </p>
        </div>
        <div className="ttx-session-controls">
          <button className="btn-secondary" onClick={startTour}>Learn to Play</button>
          <button className="btn-secondary" onClick={() => setInstructorGuideOpen(true)}>Instructor Guide</button>
          {!tour.active && <button className="btn-secondary" onClick={newSession}>New Session</button>}
        </div>
      </div>

      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}

      <div className="ttx-guide">
        <button className="ttx-guide-toggle" onClick={() => setGuideOpen((o) => !o)}>
          <span>Case brief &amp; rubric</span>
          <span className={`course-day-chevron${guideOpen ? ' open' : ''}`}>›</span>
        </button>
        {guideOpen && (
          <div>
            <p><strong>Grand Jury threshold:</strong> {activeCase.grandJuryRubric.threshold} of {activeCase.grandJuryRubric.citableFacts.length} central facts, citable with evidence. {activeCase.grandJuryRubric.guidance}</p>
            <p><strong>Outcome tiers:</strong> {activeCase.outcomeTiers.map((t) => `${t.tier} (${t.roundRange})`).join(' · ')}</p>
            <p><strong>Victory:</strong> {activeCase.victoryConditions}</p>
            <p><strong>Failure:</strong> {activeCase.failureConditions}</p>
          </div>
        )}
      </div>

      {state.gameOver && (
        <div className={`cf-outcome-banner cf-outcome-${state.outcome}`}>
          Investigation {state.outcome === 'win' ? 'won' : 'concluded — loss'}.
        </div>
      )}

      {!state.gameOver && state.playerRoster?.length > 0 && (() => {
        const active = state.playerRoster.find((p) => p.userId === state.activePlayerId);
        return (
          <p className="ttx-panel-hint" style={{ marginTop: -8, marginBottom: 12 }}>
            Round {state.round} — Investigate is {active ? <>up to <strong>{active.name}</strong></> : 'unassigned'} this round ({state.playerRoster.length} player{state.playerRoster.length === 1 ? '' : 's'} in rotation). You can always roll for them if needed.
          </p>
        );
      })()}

      <div className="cf-board">
        <CaseStrengthTrack caseStrength={state.caseStrength} />

        <div className="cf-board-main">
          {/* Evidence Decks */}
          <div className="cf-decks" data-tour="decks">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const disabled = state.gameOver || state.tokens[cat] <= 0;
              return (
                <div
                  key={cat}
                  ref={(el) => { deckElRefs.current[cat] = el; }}
                  className={`cf-deck${disabled ? ' cf-deck-disabled' : ''}${rollingCategory === cat ? ' cf-deck-pulse' : ''}${armedCategory === cat ? ' cf-deck-armed' : ''}`}
                  style={{ '--cat-color': meta.color }}
                  onClick={() => armCategory(cat)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="cf-deck-icon">{meta.icon}</span>
                  <div className="cf-deck-name">{meta.label}</div>
                  <div className="cf-deck-count">{state.deckCounts[cat]} left</div>
                  <div className="cf-deck-pips">
                    {Array.from({ length: Math.max(state.tokens[cat], 0) }, (_, i) => (
                      <span key={i} className="cf-pip cf-pip-filled" style={{ '--cat-color': meta.color }} />
                    ))}
                    {state.tokens[cat] === 0 && <span className="cf-pip" style={{ '--cat-color': meta.color }} />}
                  </div>
                  <div className="cf-deck-actions">
                    <button
                      className="cf-deck-btn"
                      style={{ '--cat-color': meta.color }}
                      disabled={state.consolidateRemaining <= 0 || state.consolidateUsedThisRound || state.gameOver}
                      title={state.consolidateUsedThisRound ? 'Already used this round — stands in for the round\'s action' : 'Recover 1 token here in place of Investigating/Developing this round (Command Pressure rises 1 level)'}
                      onClick={(e) => { e.stopPropagation(); sendAction('consolidate', { category: cat }); }}
                    >
                      Consolidate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center: roll, play area, queue */}
          <div className="cf-center">
            <div className="cf-roll-widget" data-tour="dice">
              <div className="cf-dice-area">
                <Die20
                  value={rollFace}
                  rolling={rolling}
                  idle={!armedCategory && !rolling && rollFace === null}
                  color={armedCategory ? CATEGORY_META[armedCategory].color : (rollingCategory ? CATEGORY_META[rollingCategory].color : undefined)}
                  onClick={armedCategory ? rollD20 : undefined}
                />
                {pendingCategoryDie && (
                  <Die6 value={rollFace6} rolling={rolling6} onClick={rollFace6 ? undefined : rollD6} />
                )}
              </div>
              <div className="cf-roll-outcome">
                {armedCategory && !rolling && (
                  <div>
                    Investigating <strong style={{ color: CATEGORY_META[armedCategory].color }}>{CATEGORY_META[armedCategory].label}</strong> — click the d20 to roll.
                    <div className="cf-btn-row" style={{ marginTop: 6 }}>
                      <button className="btn-secondary" onClick={() => setArmedCategory(null)}>Cancel</button>
                    </div>
                  </div>
                )}
                {!armedCategory && !rolling && !lastResult?.result?.roll && (
                  <span className="ttx-panel-hint" style={{ margin: 0 }}>Click an Evidence Deck to arm an Investigation, then roll the d20.</span>
                )}
                {lastResult?.result?.roll && !armedCategory && !rolling && (
                  <>
                    d20 = {lastResult.result.roll.nat}{lastResult.result.roll.modified !== lastResult.result.roll.nat ? ` (${lastResult.result.roll.modified} after pressure)` : ''} → <strong>{lastResult.result.roll.band?.replace('_', ' ')}</strong>
                    {lastResult.result.drawn?.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        {lastResult.result.drawn.map((d) => {
                          const card = findCard(d.cardId);
                          return (
                            <div key={d.cardId}>
                              <span style={{ color: CATEGORY_META[d.category].color, fontWeight: 600 }}>{card ? card.name : d.cardId}</span>
                              {card?.flavor && <span style={{ color: 'var(--muted)' }}> — {card.flavor}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {pendingCategoryDie && !rollFace6 && (
                      <div style={{ marginTop: 6, color: 'var(--warning)' }}>
                        {lastResult.result.roll.band === 'critical_success'
                          ? 'Bonus card! Click the d6 to see which category it comes from.'
                          : "No card yet — click the d6. It decides the category (not necessarily the one you armed) and the card, together."}
                      </div>
                    )}
                    {pendingCategoryDie && rollFace6 && (
                      <div style={{ marginTop: 6 }}>
                        d6 = {rollFace6} → {lastResult.result.roll.band === 'critical_success' ? 'bonus card from' : 'the card comes from'} <strong style={{ color: CATEGORY_META[pendingCategoryDie.bonusCategory]?.color }}>{CATEGORY_META[pendingCategoryDie.bonusCategory]?.label}</strong>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="cf-playarea-panel" ref={playAreaRef} data-tour="play-area">
              <div className="cf-track-title">Play Area</div>
              <div className="cf-playarea-grid">
                <div className="cf-play-card-complaint">
                  <div className="cf-play-card-name">Initial Complaint</div>
                  <div className="cf-play-card-complaint-text">{activeCase.caseMeta.initialComplaint}</div>
                </div>
                {dedupedEvidence.length === 0 ? (
                  <div className="cf-playarea-empty">No evidence resolved yet.</div>
                ) : (
                  dedupedEvidence.map((e, i) => {
                    const card = findCard(e.cardId);
                    const meta = card ? CATEGORY_META[card.category] : null;
                    const routed = card && activeCase.legalRouting[card.category]?.routed;
                    const nextTier = NEXT_TIER[e.tier];
                    const ladderStep = nextTier ? LADDER[nextTier] : null;
                    const alreadyQueued = state.pendingReturns.some((p) => p.cardId === e.cardId);
                    const meetsCaseStrength = ladderStep && state.caseStrength >= ladderStep.minCaseStrength;
                    const hasTokens = card && state.tokens[card.category] > 0;
                    const canDevelop = routed && ladderStep && !alreadyQueued && !state.gameOver && meetsCaseStrength && hasTokens;
                    // The disabled button used to always say "Requires Case Strength X+"
                    // regardless of which condition actually failed — e.g. it looked
                    // like a Case Strength block even when the real blocker was an
                    // exhausted token pool. Report the actual reason instead.
                    const developBlockedReason = !routed
                      ? 'Facilitator judgment call — not routed through the ladder'
                      : !meetsCaseStrength
                        ? `Requires Case Strength ${ladderStep?.minCaseStrength}+ (currently ${state.caseStrength})`
                        : !hasTokens
                          ? `No ${card ? CATEGORY_META[card.category].label : ''} tokens remaining`
                          : '';
                    const flipped = revealedIds.has(e.cardId);
                    return (
                      <div
                        key={e.cardId}
                        className="cf-play-card-flip"
                        style={{ '--cat-color': meta?.color, '--cf-rot': `${((i * 37) % 7) - 3}deg` }}
                      >
                        <div className={`cf-play-card-inner${flipped ? ' cf-flipped' : ''}`}>
                          <div className="cf-play-card-face cf-play-card-back" style={{ '--cat-color': meta?.color }}>
                            <span className="cf-deck-icon">{meta?.icon}</span>
                            <span className="cf-card-back-label">CASE FILE</span>
                          </div>
                          <div className="cf-play-card-face cf-play-card-front" style={{ '--cat-color': meta?.color }}>
                            <div className="cf-play-card-name">{card ? card.name : e.cardId}</div>
                            {card?.flavor && <div className="cf-play-card-flavor">{card.flavor}</div>}
                            <div className="cf-play-card-foot">
                              <span className="cf-play-card-tier">{tierLabel(e.tier)}</span>
                              {e.caseDefining && <span className="cf-play-card-star" title="Case-Defining">★</span>}
                            </div>
                            <div className="cf-play-card-actions">
                              {!e.caseDefining && (
                                <button disabled={state.gameOver} onClick={() => sendAction('mark_case_defining', { cardId: e.cardId })}>Case-Defining</button>
                              )}
                              {!alreadyQueued && ladderStep && (
                                <button
                                  disabled={!canDevelop}
                                  title={developBlockedReason || `Advance to ${ladderStep.label}`}
                                  onClick={() => sendAction('develop', { category: card.category, cardId: e.cardId, targetTier: nextTier, delay: ladderStep.delay })}
                                >
                                  → {ladderStep.label}
                                </button>
                              )}
                              {alreadyQueued && <span className="cf-cat-tag">Queued</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="cf-queue-panel" data-tour="queue">
              <div className="cf-track-title">Pending Returns Queue</div>
              <div className="cf-queue-row">
                {queueSlots.map((p, i) => {
                  if (!p) return <div key={`empty-${i}`} className="cf-queue-slot">empty</div>;
                  const meta = CATEGORY_META[p.category];
                  return (
                    <div key={p.cardId} className="cf-queue-slot cf-queue-slot-filled" style={{ '--cat-color': meta.color }}>
                      <div>{tierLabel(p.targetTier)}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, margin: '4px 0' }}>{p.roundsRemaining}</div>
                      <div style={{ fontSize: 8 }}>round{p.roundsRemaining === 1 ? '' : 's'} left</div>
                      <button className="cf-deck-btn" style={{ '--cat-color': meta.color, marginTop: 4 }} disabled={state.gameOver} onClick={() => sendAction('delay_pending', { cardId: p.cardId })}>Delay</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Piles */}
          <div className="cf-piles" data-tour="piles">
            <div className={`cf-pile cf-pile-positive${flashPile === 'positive' ? ' cf-pile-flash' : ''}`}>
              <div className="cf-pile-count">{positiveDrawn}</div>
              <div className="cf-pile-label">Positive Injects</div>
            </div>
            <div className={`cf-pile cf-pile-negative${flashPile === 'negative' ? ' cf-pile-flash' : ''}`}>
              <div className="cf-pile-count">{negativeDrawn}</div>
              <div className="cf-pile-label">Negative Injects</div>
            </div>
            {state.indicted && (
              <div className={`cf-pile cf-pile-defense${flashPile === 'defense_counterplay' ? ' cf-pile-flash' : ''}`}>
                <div className="cf-pile-count">{defenseDrawn}</div>
                <div className="cf-pile-label">Defense Counterplay</div>
              </div>
            )}

            {/* Pending Injects — drawn Positive/Negative cards awaiting a target before their mechanical effect applies. Lives here, right under the piles that drew them, instead of scrolled off at the bottom of the page. */}
            {pendingInjects.length > 0 && (
              <div className="cf-pending-injects" data-tour="pending-injects">
                <div className="cf-pending-injects-head">Pending — Resolve to Apply</div>
                {pendingInjects.map((pi) => (
                  <div key={pi.uid} className={`cf-inject-card cf-inject-${pi.type}`}>
                    <strong>{pi.title}</strong> {pi.band && <span className="cf-cat-tag">{pi.band}</span>}
                    <div className="ttx-panel-hint" style={{ margin: '2px 0 6px' }}>{pi.flavor}</div>
                    {pi.effect === 'defense_counterplay' && (
                      <div className="ttx-panel-hint" style={{ margin: '0 0 6px', color: pi.immune ? 'var(--primary)' : 'var(--warning)' }}>
                        {pi.immune ? 'Immune — corroborated by 2+ categories.' : `Applies — costs 1 Financial token unless corroborated.`}
                      </div>
                    )}
                    {(pi.effect === 'recover_token' || pi.effect === 'lose_token' || pi.effect === 'bonus_card') && (
                      <select className="cf-select" style={{ width: '100%' }} value={pi.category} onChange={(e) => updatePendingInject(pi.uid, { category: e.target.value })}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
                      </select>
                    )}
                    {(pi.effect === 'expedite_queue' || pi.effect === 'delay_queue') && (
                      <select className="cf-select" style={{ width: '100%' }} value={pi.queueCardId} onChange={(e) => updatePendingInject(pi.uid, { queueCardId: e.target.value })}>
                        <option value="">Select queued card…</option>
                        {state.pendingReturns.map((p) => (
                          <option key={p.cardId} value={p.cardId}>{findCard(p.cardId)?.name ?? p.cardId} ({CATEGORY_META[p.category].label})</option>
                        ))}
                      </select>
                    )}
                    {pi.effect === 'suppress_evidence' && (
                      <select className="cf-select" style={{ width: '100%' }} value={pi.evidenceCardId} onChange={(e) => updatePendingInject(pi.uid, { evidenceCardId: e.target.value })}>
                        <option value="">Select evidence card…</option>
                        {dedupedEvidence.map((e) => (
                          <option key={e.cardId} value={e.cardId}>{findCard(e.cardId)?.name ?? e.cardId} (value {e.evidenceValue ?? 1})</option>
                        ))}
                      </select>
                    )}
                    <div className="cf-btn-row" style={{ marginTop: 6 }}>
                      <button className="btn-sm-primary" style={{ flex: 1 }} onClick={() => applyPendingInject(pi)}>Apply</button>
                      <button className="btn-secondary" style={{ flex: 1 }} onClick={() => dismissPendingInject(pi.uid)}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: token bank + turn counter */}
        <div className="cf-bottom">
          <div className="cf-bank-panel" data-tour="command-panel">
            <div className="cf-track-title">Command Actions</div>
            <div className="cf-bank-row">
              <span className="ttx-panel-hint" style={{ margin: 0, minWidth: 130 }}>Command Pressure</span>
              <div className="cf-pressure-ladder">
                {PRESSURE_LEVELS.map((l) => (
                  <div
                    key={l}
                    className={`cf-pressure-cell${state.commandPressure === l ? ' cf-pressure-active' : ''}`}
                    style={{ background: PRESSURE_META[l].color, color: PRESSURE_META[l].color, opacity: state.gameOver ? 0.4 : 1, cursor: state.gameOver ? 'not-allowed' : 'pointer' }}
                    title={PRESSURE_META[l].label}
                    onClick={() => { if (!state.gameOver) sendAction('set_command_pressure', { level: l }); }}
                  />
                ))}
              </div>
            </div>
            <div className="cf-bank-row">
              <span className="ttx-panel-hint" style={{ margin: 0, minWidth: 130 }}>Consolidate the Case</span>
              <div className="cf-deck-pips">
                {Array.from({ length: state.consolidateCap }, (_, i) => (
                  <span key={i} className={`cf-pip${i < state.consolidateRemaining ? ' cf-pip-filled' : ''}`} style={{ '--cat-color': 'var(--primary)' }} />
                ))}
              </div>
              {state.consolidateUsedThisRound && <span className="cf-cat-tag">used this round</span>}
            </div>
            <div className="cf-bank-row">
              <span className="ttx-panel-hint" style={{ margin: 0, minWidth: 130 }}>Professional Judgment</span>
              <button className="btn-sm-primary" disabled={state.professionalJudgmentUsed || state.gameOver} onClick={() => sendAction('use_professional_judgment')}>
                {state.professionalJudgmentUsed ? 'Used' : 'Spend (once/game)'}
              </button>
            </div>
            <div className="cf-bank-row">
              <span className="ttx-panel-hint" style={{ margin: 0, minWidth: 130 }}>Convert Tokens (2→1)</span>
              <select className="cf-select" value={convertFrom} onChange={(e) => setConvertFrom(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
              <span>+</span>
              <select className="cf-select" value={convertFrom2} onChange={(e) => setConvertFrom2(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
              <span>→</span>
              <select className="cf-select" value={convertTo} onChange={(e) => setConvertTo(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
              </select>
              <button
                className="btn-sm-primary"
                disabled={
                  state.gameOver ||
                  (convertFrom === convertFrom2 ? state.tokens[convertFrom] < 2 : state.tokens[convertFrom] < 1 || state.tokens[convertFrom2] < 1)
                }
                onClick={() => sendAction('convert_tokens', { from: [convertFrom, convertFrom2], to: convertTo })}
              >
                Convert
              </button>
            </div>
          </div>

          <div className="cf-turns-panel">
            <div className="cf-track-title">Round {state.round}</div>
            <div className="cf-turn-strip">
              {Array.from({ length: maxTurn }, (_, i) => i + 1).map((n) => (
                <div key={n} className={`cf-turn-cell${n === state.round ? ' cf-turn-current' : ''}`}>{n}</div>
              ))}
            </div>
            <button className="btn-primary" data-tour="advance-round" style={{ marginTop: 10, width: '100%' }} disabled={state.gameOver} onClick={() => sendAction('advance_round')}>Advance Round →</button>
          </div>
        </div>
      </div>

      {/* Case Notes — narrative reveal text per central fact */}
      <section className="ttx-panel" style={{ marginTop: 16 }} data-tour="case-notes">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Case Notes — by Central Fact</span></div>
        {resolvedByFact.map(({ fact, cards }) => (
          <div key={fact.id} style={{ marginBottom: 12 }}>
            <div className="ttx-panel-hint" style={{ marginBottom: 4 }}><strong>{fact.title}</strong> — {fact.summary}</div>
            <div className="ttx-panel-hint" style={{ fontStyle: 'italic' }}>
              At {band.label} ({cards.length} card{cards.length === 1 ? '' : 's'} resolved): {activeCase.evidenceByThreshold[fact.id]?.[band.key]}
            </div>
          </div>
        ))}
      </section>

      {/* Grand Jury */}
      <section className="ttx-panel" data-tour="grand-jury">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Grand Jury Presentation</span></div>
        <p className="ttx-panel-hint">
          Facts currently citable: {citableFacts.length} of {activeCase.centralFacts.length}. Need {activeCase.grandJuryRubric.threshold}+.
        </p>
        {citableFacts.length > 0 && (
          <p className="ttx-panel-hint"><strong>Citable:</strong> {citableFacts.map((f) => f.fact.title).join(', ')}</p>
        )}
        {uncitableFacts.length > 0 && (
          <p className="ttx-panel-hint"><strong>Not yet citable:</strong> {uncitableFacts.map((f) => f.fact.title).join(', ')}</p>
        )}
        <div className="cf-btn-row">
          <button className="btn-sm-primary" disabled={state.indicted || state.gameOver} onClick={() => sendAction('present_grand_jury', { success: true })}>Present — Success</button>
          <button className="btn-secondary" disabled={state.indicted || state.gameOver} onClick={() => sendAction('present_grand_jury', { success: false, penaltyNote: 'Presentation fell short of the rubric threshold.' })}>Present — Fell Short</button>
        </div>
        {state.indicted && <p className="ttx-panel-hint" style={{ color: 'var(--primary)' }}>Indictment secured — Defense Counterplay is now active on negative injects.</p>}
      </section>

      {state.indicted && (
        <section className="ttx-panel" data-tour="defense-counterplay">
          <div className="ttx-panel-head"><span className="ttx-panel-label">Defense Counterplay Reference</span></div>
          <p className="ttx-panel-hint">{state.defenseCounterplayRemaining} cards remaining in the deck. Drawn automatically as negative injects post-indictment.</p>
          <ul className="cf-drawn-list">
            {activeCase.defenseCounterplayCards.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong> — {c.effect}
                {c.corroborationImmune && (
                  <span className="cf-cat-tag"> immune if corroborated: {findFact(c.corroborationImmune)?.title ?? c.corroborationImmune}</span>
                )}
                <button
                  className="btn-sm-primary"
                  style={{ marginLeft: 8 }}
                  disabled={state.gameOver}
                  onClick={() => {
                    const factForCard = c.corroborationImmune ? resolvedByFact.find((f) => f.fact.id === c.corroborationImmune) : null;
                    const immune = !!factForCard && factForCard.cards.length >= 2;
                    sendAction('apply_defense_counterplay', { cardId: c.id, immune, tokenPenalty: { category: 'financial', amount: 1 } });
                  }}
                >
                  Apply
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="ttx-panel" data-tour="declare-outcome">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Declare Outcome</span></div>
        <div className="cf-btn-row">
          <button className="btn-sm-primary" disabled={state.gameOver} onClick={() => sendAction('declare_outcome', { outcome: 'win' })}>Declare Win</button>
          <button className="btn-secondary" disabled={state.gameOver} onClick={() => sendAction('declare_outcome', { outcome: 'loss' })}>Declare Loss</button>
        </div>
      </section>

      {flyingCards.map((f) => (
        <div
          key={f.id}
          className="cf-flying-card"
          style={{ left: f.left, top: f.top, '--cat-color': f.color, '--dx': `${f.dx}px`, '--dy': `${f.dy}px` }}
        />
      ))}

      {instructorGuideOpen && (
        <CaseFileGuide title="Instructor Guide" sections={INSTRUCTOR_GUIDE_SECTIONS} onClose={() => setInstructorGuideOpen(false)} />
      )}
      {tour.active && <CaseFileTourOverlay tour={tour} />}
    </div>
  );
}
