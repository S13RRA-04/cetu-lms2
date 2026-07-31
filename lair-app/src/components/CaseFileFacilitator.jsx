import { useEffect, useState } from 'react';
import useCaseFileSession from '../hooks/useCaseFileSession.js';
import {
  caseMeta,
  centralFacts,
  evidenceCards,
  evidenceByThreshold,
  legalRouting,
  grandJuryRubric,
  outcomeTiers,
  victoryConditions,
  failureConditions,
  defenseCounterplayCards,
  buildDeckPayload,
  bandForCaseStrength,
  findCard,
  findFact,
  findDefenseCard,
  positiveInjectById,
  negativeInjectById,
} from '../data/caseFileSample.js';

const CATEGORY_LABELS = {
  interviews: 'Interviews',
  documents: 'Documents',
  digital: 'Digital',
  physical: 'Physical',
  financial: 'Financial',
  intelligence: 'Intelligence',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);
const PRESSURE_LEVELS = ['green', 'yellow', 'orange', 'red', 'black'];
// Legal Instrument Ladder: tier -> { delay, minCaseStrength } per the Rulebook.
const LADDER = {
  subpoena: { label: 'Subpoena', delay: 1, minCaseStrength: 5 },
  court_order: { label: 'Court Order', delay: 2, minCaseStrength: 11 },
  search_warrant: { label: 'Search Warrant', delay: 3, minCaseStrength: 16 },
};
const NEXT_TIER = { discovered: 'subpoena', subpoena: 'court_order', court_order: 'search_warrant' };

function TierBadge({ tier }) {
  const label = tier === 'discovered' ? 'Discovered' : (LADDER[tier]?.label ?? tier);
  return <span className="cf-tier-badge">{label}</span>;
}

export default function CaseFileFacilitator() {
  const [started, setStarted] = useState(false);
  const [session] = useState(() => buildDeckPayload());
  const { connected, code, state, lastResult, error, ended, sendAction } = useCaseFileSession({
    role: 'facilitator',
    session,
    enabled: started,
  });

  const [selectedCategory, setSelectedCategory] = useState('documents');
  const [convertFrom, setConvertFrom] = useState('documents');
  const [convertTo, setConvertTo] = useState('financial');
  const [guideOpen, setGuideOpen] = useState(true);

  useEffect(() => {
    if (ended) setStarted(false);
  }, [ended]);

  function newSession() {
    setStarted(false);
    setTimeout(() => setStarted(true), 0);
  }

  if (!started || !state) {
    return (
      <div className="ttx-wrap">
        <div className="ttx-header">
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Case File — Facilitator</h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>{caseMeta.title}</p>
          </div>
        </div>
        <div className="ttx-guide">
          <p style={{ margin: '0 0 12px' }}>{caseMeta.premise}</p>
          <p style={{ margin: '0 0 16px', color: 'var(--text)' }}><strong>Initial Complaint:</strong> {caseMeta.initialComplaint}</p>
          <button className="btn-primary" onClick={newSession}>
            {started ? 'Connecting…' : 'Start Investigation'}
          </button>
          {error && <p style={{ color: 'var(--danger)', marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  const band = bandForCaseStrength(state.caseStrength);
  // A card can appear multiple times in resolvedEvidence (once per ladder
  // tier it advances through, per develop()/advanceRound()) — collapse to
  // one row per card at its highest tier reached, OR-ing caseDefining
  // (markCaseDefining always flags the first/lowest-tier entry).
  const TIER_RANK = { discovered: 0, subpoena: 1, court_order: 2, search_warrant: 3 };
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
  const resolvedByFact = centralFacts.map((fact) => {
    const cards = dedupedEvidence.filter((e) => findCard(e.cardId)?.factId === fact.id);
    return { fact, cards };
  });

  return (
    <div className="ttx-wrap">
      <div className="ttx-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Case File — Facilitator</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            {caseMeta.title} · Room Code: <strong style={{ color: 'var(--primary)' }}>{code}</strong> · {connected ? 'Connected' : 'Reconnecting…'}
          </p>
        </div>
        <div className="ttx-session-controls">
          <button className="btn-secondary" onClick={newSession}>New Session</button>
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
            <p><strong>Grand Jury threshold:</strong> {grandJuryRubric.threshold} of {grandJuryRubric.citableFacts.length} central facts, citable with evidence. {grandJuryRubric.guidance}</p>
            <p><strong>Outcome tiers:</strong> {outcomeTiers.map((t) => `${t.tier} (${t.roundRange})`).join(' · ')}</p>
            <p><strong>Victory:</strong> {victoryConditions}</p>
            <p><strong>Failure:</strong> {failureConditions}</p>
          </div>
        )}
      </div>

      {/* Top status bar */}
      <div className="cf-status-bar">
        <div className="cf-stat"><span className="cf-stat-label">Round</span><span className="cf-stat-value">{state.round}</span></div>
        <div className="cf-stat"><span className="cf-stat-label">Case Strength</span><span className="cf-stat-value">{state.caseStrength} / 30</span></div>
        <div className="cf-stat"><span className="cf-stat-label">Band</span><span className="cf-stat-value">{band.label}</span></div>
        <div className="cf-stat">
          <span className="cf-stat-label">Command Pressure</span>
          <select className="cf-select" value={state.commandPressure} onChange={(e) => sendAction('set_command_pressure', { level: e.target.value })}>
            {PRESSURE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="cf-stat"><span className="cf-stat-label">Consolidate</span><span className="cf-stat-value">{state.consolidateRemaining} / {state.consolidateCap}</span></div>
        <div className="cf-stat">
          <span className="cf-stat-label">Professional Judgment</span>
          <button className="btn-sm-primary" disabled={state.professionalJudgmentUsed} onClick={() => sendAction('use_professional_judgment')}>
            {state.professionalJudgmentUsed ? 'Used' : 'Spend'}
          </button>
        </div>
        <button className="btn-secondary" onClick={() => sendAction('advance_round')}>Advance Round →</button>
      </div>

      {state.gameOver && (
        <div className={`cf-outcome-banner cf-outcome-${state.outcome}`}>
          Investigation {state.outcome === 'win' ? 'won' : 'concluded — loss'}.
        </div>
      )}

      {lastResult?.result?.roll && (
        <div className="cf-roll-result">
          d20 = {lastResult.result.roll.nat}{lastResult.result.roll.modified !== lastResult.result.roll.nat ? ` (${lastResult.result.roll.modified} after pressure)` : ''} → <strong>{lastResult.result.roll.band}</strong>
          {lastResult.result.drawn?.length > 0 && (
            <ul className="cf-drawn-list">
              {lastResult.result.drawn.map((d) => {
                const card = findCard(d.cardId);
                return <li key={d.cardId}>{card ? card.name : d.cardId} <span className="cf-cat-tag">{CATEGORY_LABELS[d.category]}</span></li>;
              })}
            </ul>
          )}
          {lastResult.result.injects?.length > 0 && (
            <ul className="cf-drawn-list">
              {lastResult.result.injects.map((inj, i) => {
                const text = inj.type === 'positive' ? positiveInjectById(inj.cardId)?.text
                  : inj.type === 'negative' ? negativeInjectById(inj.cardId)?.text
                  : findDefenseCard(inj.cardId)?.name;
                return <li key={i} className={`cf-inject-${inj.type}`}>{inj.type.replace('_', ' ')}: {text}</li>;
              })}
            </ul>
          )}
        </div>
      )}

      {/* Token / category board */}
      <div className="ttx-board">
        {CATEGORIES.map((cat) => (
          <section key={cat} className="ttx-panel">
            <div className="ttx-panel-head">
              <span className="ttx-panel-label">{CATEGORY_LABELS[cat]}</span>
              <span className="cf-token-count">{state.tokens[cat]} token{state.tokens[cat] === 1 ? '' : 's'}</span>
            </div>
            <p className="ttx-panel-hint">{state.deckCounts[cat]} cards remaining in deck. {legalRouting[cat].note}</p>
            <div className="cf-btn-row">
              <button className="btn-sm-primary" disabled={state.tokens[cat] <= 0 || state.gameOver} onClick={() => sendAction('investigate', { category: cat, actionType: 'investigate' })}>Investigate</button>
              <button className="btn-secondary" disabled={state.consolidateRemaining <= 0 || state.gameOver} onClick={() => sendAction('consolidate', { category: cat })}>Consolidate</button>
            </div>
          </section>
        ))}
      </div>

      {/* Token conversion */}
      <section className="ttx-panel">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Convert Tokens (2 → 1)</span></div>
        <div className="cf-btn-row">
          <select className="cf-select" value={convertFrom} onChange={(e) => setConvertFrom(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <span>→</span>
          <select className="cf-select" value={convertTo} onChange={(e) => setConvertTo(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <button className="btn-sm-primary" disabled={state.tokens[convertFrom] < 2 || state.gameOver} onClick={() => sendAction('convert_tokens', { from: convertFrom, to: convertTo })}>Convert</button>
        </div>
      </section>

      {/* Pending Returns Queue */}
      <section className="ttx-panel">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Pending Returns Queue</span></div>
        {state.pendingReturns.length === 0 ? (
          <div className="ttx-card-empty">Nothing queued.</div>
        ) : (
          <div className="ttx-log">
            {state.pendingReturns.map((p) => {
              const card = findCard(p.cardId);
              return (
                <div key={p.cardId} className="ttx-log-row">
                  <span className="ttx-log-text">{card ? card.name : p.cardId} <TierBadge tier={p.targetTier} /></span>
                  <span className="ttx-log-roll">{p.roundsRemaining} round{p.roundsRemaining === 1 ? '' : 's'} left</span>
                  <button className="btn-sm-primary" onClick={() => sendAction('delay_pending', { cardId: p.cardId })}>Delay</button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Resolved Evidence by fact */}
      <section className="ttx-panel">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Resolved Evidence — by Central Fact</span></div>
        {resolvedByFact.map(({ fact, cards }) => (
          <div key={fact.id} style={{ marginBottom: 14 }}>
            <div className="ttx-panel-hint" style={{ marginBottom: 4 }}><strong>{fact.title}</strong> — {fact.summary}</div>
            <div className="ttx-panel-hint" style={{ marginBottom: 6, fontStyle: 'italic' }}>
              At {band.label}: {evidenceByThreshold[fact.id]?.[band.key]}
            </div>
            {cards.length === 0 ? (
              <div className="ttx-card-empty">No evidence resolved for this fact yet.</div>
            ) : (
              <ul className="cf-drawn-list">
                {cards.map((e) => {
                  const card = findCard(e.cardId);
                  const routed = card && legalRouting[card.category]?.routed;
                  const nextTier = NEXT_TIER[e.tier];
                  const ladderStep = nextTier ? LADDER[nextTier] : null;
                  const alreadyQueued = state.pendingReturns.some((p) => p.cardId === e.cardId);
                  const canDevelop = routed && ladderStep && !alreadyQueued && !state.gameOver
                    && state.caseStrength >= ladderStep.minCaseStrength
                    && card && state.tokens[card.category] > 0;
                  return (
                    <li key={e.cardId}>
                      {card ? card.name : e.cardId} <TierBadge tier={e.tier} />
                      {e.caseDefining && <span className="cf-cd-badge">Case-Defining</span>}
                      {!e.caseDefining && (
                        <button className="btn-sm-primary" onClick={() => sendAction('mark_case_defining', { cardId: e.cardId })}>Mark Case-Defining</button>
                      )}
                      {alreadyQueued && <span className="cf-cat-tag">Queued</span>}
                      {!alreadyQueued && ladderStep && (
                        <button
                          className="btn-secondary"
                          disabled={!canDevelop}
                          title={!routed ? 'This category is a facilitator judgment call, not routed through the ladder' : `Requires Case Strength ${ladderStep.minCaseStrength}+`}
                          onClick={() => sendAction('develop', { category: card.category, cardId: e.cardId, targetTier: nextTier, delay: ladderStep.delay })}
                        >
                          Develop → {ladderStep.label}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* Grand Jury */}
      <section className="ttx-panel">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Grand Jury Presentation</span></div>
        <p className="ttx-panel-hint">
          Facts currently citable: {resolvedByFact.filter((f) => f.cards.length > 0).length} of {centralFacts.length}.
          Need {grandJuryRubric.threshold}+.
        </p>
        <div className="cf-btn-row">
          <button className="btn-sm-primary" disabled={state.indicted || state.gameOver} onClick={() => sendAction('present_grand_jury', { success: true })}>Present — Success</button>
          <button className="btn-secondary" disabled={state.indicted || state.gameOver} onClick={() => sendAction('present_grand_jury', { success: false, penaltyNote: 'Presentation fell short of the rubric threshold.' })}>Present — Fell Short</button>
        </div>
        {state.indicted && <p className="ttx-panel-hint" style={{ color: 'var(--primary)' }}>Indictment secured — Defense Counterplay is now active on negative injects.</p>}
      </section>

      {/* Defense Counterplay reference (post-indictment) */}
      {state.indicted && (
        <section className="ttx-panel">
          <div className="ttx-panel-head"><span className="ttx-panel-label">Defense Counterplay Reference</span></div>
          <p className="ttx-panel-hint">{state.defenseCounterplayRemaining} cards remaining in the deck. Drawn automatically as negative injects post-indictment.</p>
          <ul className="cf-drawn-list">
            {defenseCounterplayCards.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong> — {c.effect}
                {c.corroborationImmune && (
                  <span className="cf-cat-tag"> immune if corroborated: {findFact(c.corroborationImmune)?.title ?? c.corroborationImmune}</span>
                )}
                <button
                  className="btn-sm-primary"
                  style={{ marginLeft: 8 }}
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

      {/* Manual outcome override */}
      <section className="ttx-panel">
        <div className="ttx-panel-head"><span className="ttx-panel-label">Declare Outcome</span></div>
        <div className="cf-btn-row">
          <button className="btn-sm-primary" disabled={state.gameOver} onClick={() => sendAction('declare_outcome', { outcome: 'win' })}>Declare Win</button>
          <button className="btn-secondary" disabled={state.gameOver} onClick={() => sendAction('declare_outcome', { outcome: 'loss' })}>Declare Loss</button>
        </div>
      </section>
    </div>
  );
}
