import { useState } from 'react';
import useCaseFileSession from '../hooks/useCaseFileSession.js';
import { bandForCaseStrength, BAND_THRESHOLDS } from '../data/caseFileCaseUtils.js';
import { CATEGORY_META, CATEGORIES, BAND_META, PRESSURE_META } from '../data/caseFileTheme.js';
import CaseFileGuide from './CaseFileGuide.jsx';
import { PLAYER_GUIDE_SECTIONS } from '../data/caseFileGuideContent.js';
import CaseFileTourOverlay from './CaseFileTourOverlay.jsx';
import useCaseFileTour from '../hooks/useCaseFileTour.js';
import { PLAYER_TOUR_BEATS } from '../data/caseFileTourScript.js';

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
  const error = tour.active ? null : live.error;
  const ended = tour.active ? false : live.ended;

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

      <div className="cf-board" data-tour="board">
        <CaseStrengthTrack caseStrength={state.caseStrength} />

        <div className="cf-board-main">
          {/* Evidence Decks (read-only — counts only, never card names) */}
          <div className="cf-decks" data-tour="decks">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              return (
                <div key={cat} className="cf-deck cf-deck-disabled" style={{ '--cat-color': meta.color, cursor: 'default' }}>
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
