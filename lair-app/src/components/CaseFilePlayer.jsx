import { useState } from 'react';
import useCaseFileSession from '../hooks/useCaseFileSession.js';
import { bandForCaseStrength } from '../data/caseFileSample.js';

const CATEGORY_LABELS = {
  interviews: 'Interviews',
  documents: 'Documents',
  digital: 'Digital',
  physical: 'Physical',
  financial: 'Financial',
  intelligence: 'Intelligence',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function CaseFilePlayer() {
  const [codeInput, setCodeInput] = useState('');
  const [joinCode, setJoinCode] = useState(null);
  const { connected, code, state, error, ended } = useCaseFileSession({
    role: 'player',
    joinCode,
    enabled: !!joinCode,
  });

  if (!joinCode || ended) {
    return (
      <div className="ttx-wrap">
        <div className="ttx-header">
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Case File</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>Enter the room code your facilitator gave you.</p>
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
      </div>
    );
  }

  if (!state) {
    return (
      <div className="ttx-wrap">
        <p className="page-subtitle">Connecting to session {joinCode}…</p>
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    );
  }

  const band = bandForCaseStrength(state.caseStrength);
  const evidenceCountByCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = state.resolvedEvidence.filter((e) => e.category === cat).length;
    return acc;
  }, {});

  return (
    <div className="ttx-wrap">
      <div className="ttx-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Case File — Investigation Board</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Room {code} · {connected ? 'Connected' : 'Reconnecting…'}
          </p>
        </div>
      </div>

      <div className="cf-status-bar">
        <div className="cf-stat"><span className="cf-stat-label">Round</span><span className="cf-stat-value">{state.round}</span></div>
        <div className="cf-stat"><span className="cf-stat-label">Case Strength</span><span className="cf-stat-value">{state.caseStrength} / 30</span></div>
        <div className="cf-stat"><span className="cf-stat-label">Band</span><span className="cf-stat-value">{band.label}</span></div>
        <div className="cf-stat"><span className="cf-stat-label">Command Pressure</span><span className="cf-stat-value">{state.commandPressure}</span></div>
        <div className="cf-stat"><span className="cf-stat-label">Consolidate</span><span className="cf-stat-value">{state.consolidateRemaining} / {state.consolidateCap}</span></div>
        <div className="cf-stat"><span className="cf-stat-label">Professional Judgment</span><span className="cf-stat-value">{state.professionalJudgmentUsed ? 'Used' : 'Available'}</span></div>
      </div>

      {state.gameOver && (
        <div className={`cf-outcome-banner cf-outcome-${state.outcome}`}>
          Investigation {state.outcome === 'win' ? 'won' : 'concluded — loss'}.
        </div>
      )}
      {state.indicted && !state.gameOver && (
        <div className="cf-outcome-banner">Indictment secured — Defense Counterplay is now active.</div>
      )}

      <div className="ttx-board">
        {CATEGORIES.map((cat) => (
          <section key={cat} className="ttx-panel">
            <div className="ttx-panel-head">
              <span className="ttx-panel-label">{CATEGORY_LABELS[cat]}</span>
              <span className="cf-token-count">{state.tokens[cat]} token{state.tokens[cat] === 1 ? '' : 's'}</span>
            </div>
            <p className="ttx-panel-hint">{evidenceCountByCategory[cat]} evidence resolved · {state.deckCounts[cat]} left in deck</p>
          </section>
        ))}
      </div>

      <section className="ttx-panel">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Pending Returns Queue</span></div>
        {state.pendingReturns.length === 0 ? (
          <div className="ttx-card-empty">Nothing queued.</div>
        ) : (
          <div className="ttx-log">
            {state.pendingReturns.map((p) => (
              <div key={p.cardId} className="ttx-log-row">
                <span className="ttx-log-text">{CATEGORY_LABELS[p.category]} evidence</span>
                <span className="ttx-log-roll">{p.roundsRemaining} round{p.roundsRemaining === 1 ? '' : 's'} left</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
