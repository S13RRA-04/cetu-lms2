import { useEffect, useRef, useState } from 'react';
import useCaseFileSession from '../hooks/useCaseFileSession.js';
import useAuthStore from '../store/authStore.js';
import { bandForCaseStrength, BAND_THRESHOLDS } from '../data/caseFileCaseUtils.js';
import { CATEGORY_META, CATEGORIES, BAND_META, PRESSURE_META } from '../data/caseFileTheme.js';
import CaseFileGuide from './CaseFileGuide.jsx';
import { PLAYER_GUIDE_SECTIONS } from '../data/caseFileGuideContent.js';
import CaseFileTourOverlay from './CaseFileTourOverlay.jsx';
import useCaseFileTour from '../hooks/useCaseFileTour.js';
import { PLAYER_TOUR_BEATS } from '../data/caseFileTourScript.js';
import { Die20, Die6 } from './CaseFileDice.jsx';

const ROLL_MIN_MS = 550;

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
              style={{ background: reached ? BAND_META[bandKey].color : undefined, '--cf-marker-color': BAND_META[bandKey].color }}
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

export default function CaseFilePlayer() {
  const [codeInput, setCodeInput] = useState('');
  const [joinCode, setJoinCode] = useState(null);
  const [playerGuideOpen, setPlayerGuideOpen] = useState(false);

  // "Learn to Play" — a scripted walkthrough that impersonates
  // useCaseFileSession's return shape (see useCaseFileTour.js) so the real
  // board below renders unmodified whether it's live or touring.
  const tour = useCaseFileTour(PLAYER_TOUR_BEATS);

  const live = useCaseFileSession({
    role: 'player',
    joinCode,
    enabled: !!joinCode && !tour.active,
  });
  const connected = tour.active ? true : live.connected;
  const code = tour.active ? 'DEMO' : live.code;
  const state = tour.active ? tour.state : live.state;
  const lastResult = tour.active ? tour.lastResult : live.lastResult;
  const error = tour.active ? null : live.error;
  const ended = tour.active ? false : live.ended;
  const sendAction = tour.active ? tour.sendAction : live.sendAction;

  const myUserId = useAuthStore((s) => s.user?.id);
  const isMyTurn = !!state && state.activePlayerId === myUserId;
  const activePlayer = state?.playerRoster?.find((p) => p.userId === state.activePlayerId) ?? null;

  // Turn rotation: one connected player is the active roller each round
  // (see caseFileCoordinator.js's activePlayerId). Everything below mirrors
  // CaseFileFacilitator.jsx's arm/roll gesture, but scoped to Investigate
  // only — Develop and every other action stay facilitator-only, and no
  // card names ever reach this client (only IDs/categories/counts do), so
  // the roll outcome here is numbers-only; the facilitator narrates.
  const [armedCategory, setArmedCategory] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [rollFace, setRollFace] = useState(null);
  const [rollingCategory, setRollingCategory] = useState(null);
  const rollTimer = useRef(null);
  const rollStart = useRef(0);
  const pendingRequestId = useRef(null);

  const [pendingCategoryDie, setPendingCategoryDie] = useState(null); // { value, bonusCategory } | null
  const [rollFace6, setRollFace6] = useState(null);
  const [rolling6, setRolling6] = useState(false);
  const roll6Timer = useRef(null);

  useEffect(() => () => {
    clearInterval(rollTimer.current);
    clearInterval(roll6Timer.current);
  }, []);

  useEffect(() => {
    if (!rolling || !lastResult || lastResult.requestId !== pendingRequestId.current) return;
    const elapsed = Date.now() - rollStart.current;
    const wait = Math.max(0, ROLL_MIN_MS - elapsed);
    const t = setTimeout(() => {
      clearInterval(rollTimer.current);
      setRollFace(lastResult.result?.roll?.nat ?? null);
      setRolling(false);
      setRollingCategory(null);
      const dieRoll = lastResult.result?.roll?.categoryDieRoll;
      if (dieRoll) {
        const bonus = lastResult.result.drawn?.[lastResult.result.drawn.length - 1];
        setPendingCategoryDie({ value: dieRoll, bonusCategory: bonus?.category });
      }
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult, rolling]);

  function armCategory(cat) {
    if (!isMyTurn || rolling || !state || state.tokens[cat] <= 0 || state.gameOver) return;
    setArmedCategory(cat);
    setRollFace(null);
    setPendingCategoryDie(null);
    setRollFace6(null);
  }

  function rollD20() {
    if (!armedCategory || rolling || !state) return;
    const cat = armedCategory;
    setRolling(true);
    setRollingCategory(cat);
    rollStart.current = Date.now();
    clearInterval(rollTimer.current);
    rollTimer.current = setInterval(() => setRollFace(1 + Math.floor(Math.random() * 20)), 70);
    pendingRequestId.current = sendAction('investigate', { category: cat, actionType: 'investigate' });
    setArmedCategory(null);
  }

  function rollD6() {
    if (!pendingCategoryDie || rolling6) return;
    setRolling6(true);
    clearInterval(roll6Timer.current);
    roll6Timer.current = setInterval(() => setRollFace6(1 + Math.floor(Math.random() * 6)), 70);
    const target = pendingCategoryDie.value;
    setTimeout(() => {
      clearInterval(roll6Timer.current);
      setRollFace6(target);
      setRolling6(false);
    }, 500);
  }

  if ((!joinCode || ended) && !tour.active) {
    return (
      <div className="ttx-wrap cf-tabletop">
        <div className="ttx-header">
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Case File</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Enter the room code your facilitator gave you.</p>
          </div>
          <div className="ttx-session-controls">
            <button className="btn-secondary" onClick={tour.start}>Learn to Play</button>
            <button className="btn-secondary" onClick={() => setPlayerGuideOpen(true)}>How to Play</button>
          </div>
        </div>
        <div className="ttx-guide">
          {ended && <p style={{ color: 'var(--warning)' }}>The investigation session has ended.</p>}
          <div className="cf-btn-row">
            <input
              className="cf-select"
              style={{ minWidth: 160, textTransform: 'uppercase' }}
              value={codeInput}
              maxLength={5}
              placeholder="ROOM CODE"
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter' && codeInput.trim()) setJoinCode(codeInput.trim()); }}
            />
            <button className="btn-primary" disabled={!codeInput.trim()} onClick={() => setJoinCode(codeInput.trim())}>Join</button>
          </div>
          {error && <p style={{ color: 'var(--danger)', marginTop: 12 }}>{error}</p>}
        </div>
        {playerGuideOpen && (
          <CaseFileGuide title="How to Play" sections={PLAYER_GUIDE_SECTIONS} onClose={() => setPlayerGuideOpen(false)} />
        )}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="ttx-wrap cf-tabletop">
        <p className="page-subtitle">Connecting to session {joinCode}…</p>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }

  const queueSlots = state.pendingReturns.length > 0 ? state.pendingReturns : [null, null, null];
  const maxTurn = Math.max(state.round + 3, 12);

  return (
    <div className="ttx-wrap cf-tabletop">
      <div className="ttx-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Case File — Investigation Board</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Room {code} · {connected ? 'Connected' : 'Reconnecting…'}
          </p>
        </div>
        <div className="ttx-session-controls">
          <button className="btn-secondary" onClick={tour.start}>Learn to Play</button>
          <button className="btn-secondary" onClick={() => setPlayerGuideOpen(true)}>How to Play</button>
        </div>
      </div>

      {playerGuideOpen && (
        <CaseFileGuide title="How to Play" sections={PLAYER_GUIDE_SECTIONS} onClose={() => setPlayerGuideOpen(false)} />
      )}

      {state.gameOver && (
        <div className={`cf-outcome-banner cf-outcome-${state.outcome}`}>
          Investigation {state.outcome === 'win' ? 'won' : 'concluded — loss'}.
        </div>
      )}
      {state.indicted && !state.gameOver && (
        <div className="cf-outcome-banner">Indictment secured — Defense Counterplay is now active.</div>
      )}

      {!state.gameOver && (
        <div className="ttx-panel-hint" style={isMyTurn ? { color: 'var(--primary)', fontWeight: 700 } : undefined}>
          Round {state.round} — {
            isMyTurn
              ? "Your turn — arm a deck below and roll."
              : activePlayer
                ? `Waiting for ${activePlayer.name} to investigate.`
                : 'Waiting for a player to join before the roll can rotate.'
          }
        </div>
      )}

      <div className="cf-board" data-tour="board">
        <CaseStrengthTrack caseStrength={state.caseStrength} />

        <div className="cf-board-main">
          {/* Evidence Decks — counts only, never card names. Clickable to
              arm an Investigate roll only when it's this player's turn. */}
          <div className="cf-decks" data-tour="decks">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const interactive = isMyTurn && !rolling && state.tokens[cat] > 0 && !state.gameOver;
              const disabled = !interactive;
              return (
                <div
                  key={cat}
                  className={`cf-deck${disabled ? ' cf-deck-disabled' : ''}${rollingCategory === cat ? ' cf-deck-pulse' : ''}${armedCategory === cat ? ' cf-deck-armed' : ''}`}
                  style={{ '--cat-color': meta.color, cursor: interactive ? 'pointer' : 'default' }}
                  onClick={interactive ? () => armCategory(cat) : undefined}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
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
                </div>
              );
            })}
          </div>

          <div className="cf-center">
            {isMyTurn && (
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
                      {pendingCategoryDie && !rollFace6 && (
                        <div style={{ marginTop: 6, color: 'var(--warning)' }}>Bonus card! Click the d6 to see which category it comes from.</div>
                      )}
                      {pendingCategoryDie && rollFace6 && (
                        <div style={{ marginTop: 6 }}>
                          d6 = {rollFace6} → bonus card from <strong style={{ color: CATEGORY_META[pendingCategoryDie.bonusCategory]?.color }}>{CATEGORY_META[pendingCategoryDie.bonusCategory]?.label}</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="cf-playarea-panel" data-tour="play-area">
              <div className="cf-track-title">Play Area</div>
              {state.resolvedEvidence.length === 0 ? (
                <div className="cf-playarea-empty">No evidence resolved yet.</div>
              ) : (
                <div className="cf-playarea-grid">
                  {Object.entries(
                    state.resolvedEvidence.reduce((acc, e) => {
                      acc[e.category] = (acc[e.category] ?? 0) + 1;
                      return acc;
                    }, {})
                  ).map(([cat, count]) => (
                    <div key={cat} className="cf-play-card" style={{ '--cat-color': CATEGORY_META[cat].color }}>
                      <div className="cf-play-card-name">{CATEGORY_META[cat].label}</div>
                      <div className="cf-play-card-foot">
                        <span className="cf-play-card-tier">{count} resolved</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="cf-queue-panel" data-tour="queue">
              <div className="cf-track-title">Pending Returns Queue</div>
              <div className="cf-queue-row">
                {queueSlots.map((p, i) => {
                  if (!p) return <div key={`empty-${i}`} className="cf-queue-slot">empty</div>;
                  const meta = CATEGORY_META[p.category];
                  return (
                    <div key={p.cardId} className="cf-queue-slot cf-queue-slot-filled" style={{ '--cat-color': meta.color }}>
                      <div>{meta.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, margin: '4px 0' }}>{p.roundsRemaining}</div>
                      <div style={{ fontSize: 8 }}>round{p.roundsRemaining === 1 ? '' : 's'} left</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="cf-piles">
            <div className="cf-pile">
              <div className="cf-pile-count">{state.consolidateRemaining}</div>
              <div className="cf-pile-label">Consolidate Left</div>
            </div>
            <div className="cf-pile">
              <div className="cf-pile-count">{state.professionalJudgmentUsed ? '0' : '1'}</div>
              <div className="cf-pile-label">Professional Judgment</div>
            </div>
          </div>
        </div>

        <div className="cf-bottom">
          <div className="cf-bank-panel" data-tour="status">
            <div className="cf-track-title">Status</div>
            <div className="cf-bank-row">
              <span className="ttx-panel-hint" style={{ margin: 0, minWidth: 130 }}>Command Pressure</span>
              <span style={{ color: PRESSURE_META[state.commandPressure].color, fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>
                {PRESSURE_META[state.commandPressure].label}
              </span>
            </div>
          </div>
          <div className="cf-turns-panel" data-tour="turns">
            <div className="cf-track-title">Round {state.round}</div>
            <div className="cf-turn-strip">
              {Array.from({ length: maxTurn }, (_, i) => i + 1).map((n) => (
                <div key={n} className={`cf-turn-cell${n === state.round ? ' cf-turn-current' : ''}`}>{n}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {tour.active && <CaseFileTourOverlay tour={tour} />}
    </div>
  );
}
