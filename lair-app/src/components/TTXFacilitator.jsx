import { useEffect, useRef, useState } from 'react';
import { SCENARIOS, PROCEDURES, INJECTS } from '../data/ttxCards.js';

function shuffledIds(items) {
  const ids = items.map((i) => i.id ?? i);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export default function TTXFacilitator() {
  const [scenario, setScenario] = useState(null);
  const [scenarioDeck, setScenarioDeck] = useState(() => shuffledIds(SCENARIOS));

  const [rolling, setRolling] = useState(false);
  const [rollFace, setRollFace] = useState(null);
  const [procedureLog, setProcedureLog] = useState([]); // [{ roll, title, illustration }]

  const [injectDeck, setInjectDeck] = useState(() => shuffledIds(INJECTS));
  const [injectsDrawn, setInjectsDrawn] = useState([]); // [{ id, text }]

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startRef = useRef(null);
  const rollTimerRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => () => clearInterval(rollTimerRef.current), []);

  function newSession() {
    setScenario(null);
    setScenarioDeck(shuffledIds(SCENARIOS));
    setProcedureLog([]);
    setInjectDeck(shuffledIds(INJECTS));
    setInjectsDrawn([]);
    setElapsed(0);
    setRunning(false);
    startRef.current = null;
  }

  function drawScenario() {
    let deck = scenarioDeck;
    if (deck.length === 0) deck = shuffledIds(SCENARIOS);
    const [id, ...rest] = deck;
    setScenario(SCENARIOS.find((s) => s.id === id));
    setScenarioDeck(rest);
    if (!running) { setRunning(true); startRef.current = Date.now(); }
  }

  function rollProcedure() {
    if (rolling) return;
    setRolling(true);
    let ticks = 0;
    rollTimerRef.current = setInterval(() => {
      setRollFace(1 + Math.floor(Math.random() * 20));
      ticks += 1;
      if (ticks >= 12) {
        clearInterval(rollTimerRef.current);
        const finalRoll = 1 + Math.floor(Math.random() * 20);
        setRollFace(finalRoll);
        const proc = PROCEDURES[finalRoll - 1];
        setProcedureLog((log) => [{ roll: finalRoll, title: proc.title, illustration: proc.illustration }, ...log]);
        setRolling(false);
      }
    }, 70);
  }

  function drawInject() {
    let deck = injectDeck;
    if (deck.length === 0) deck = shuffledIds(INJECTS);
    const [id, ...rest] = deck;
    setInjectsDrawn((prev) => [INJECTS.find((i) => i.id === id), ...prev]);
    setInjectDeck(rest);
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="ttx-wrap">
      <div className="ttx-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Tabletop Exercise Facilitator</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Draw a scenario, roll for a response procedure, and introduce injects as the discussion runs.
          </p>
        </div>
        <div className="ttx-session-controls">
          <div className="ttx-timer">{mm}:{ss}</div>
          <button className="btn-secondary" onClick={newSession}>New Session</button>
        </div>
      </div>

      <div className="ttx-board">
        <section className="ttx-panel">
          <div className="ttx-panel-head">
            <span className="ttx-panel-label">Scenario</span>
            <button className="btn-sm-primary" onClick={drawScenario}>
              {scenario ? 'Redraw' : 'Draw Scenario'}
            </button>
          </div>
          {scenario ? (
            <div className="ttx-card ttx-card-scenario">
              {scenario.illustration && (
                <img className="ttx-card-art" src={scenario.illustration} alt="" />
              )}
              <div className="ttx-card-title">{scenario.title}</div>
              <div className="ttx-card-text">{scenario.text}</div>
            </div>
          ) : (
            <div className="ttx-card-empty">No scenario drawn yet.</div>
          )}
        </section>

        <section className="ttx-panel">
          <div className="ttx-panel-head">
            <span className="ttx-panel-label">Procedure (d20)</span>
            <button className="btn-sm-primary" onClick={rollProcedure} disabled={rolling}>
              {rolling ? 'Rolling…' : 'Roll for Procedure'}
            </button>
          </div>
          {rollFace !== null && (
            <div className={`ttx-die${rolling ? ' ttx-die-rolling' : ''}`}>{rollFace}</div>
          )}
          {!rolling && procedureLog[0] && (
            <img className="ttx-card-art ttx-card-art-sm" src={procedureLog[0].illustration} alt="" />
          )}
          <div className="ttx-log">
            {procedureLog.length === 0 && !rolling && <div className="ttx-card-empty">No rolls yet.</div>}
            {procedureLog.map((entry, i) => (
              <div key={i} className="ttx-log-row">
                <span className="ttx-log-roll">d20 → {entry.roll}</span>
                <span className="ttx-log-text">{entry.title}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ttx-panel">
          <div className="ttx-panel-head">
            <span className="ttx-panel-label">Injects</span>
            <button className="btn-sm-primary" onClick={drawInject}>Draw Inject</button>
          </div>
          <div className="ttx-log">
            {injectsDrawn.length === 0 && <div className="ttx-card-empty">No injects drawn yet.</div>}
            {injectsDrawn.map((inj, i) => (
              <div key={i} className="ttx-card ttx-card-inject">
                {inj.illustration && <img className="ttx-card-art-thumb" src={inj.illustration} alt="" />}
                <span>{inj.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
