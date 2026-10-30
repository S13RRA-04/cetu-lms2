import { useEffect, useRef, useState } from 'react';

/* The first-place tiebreak duel (lightning round), as the server describes it
   (backend services/tiebreakDuel.service.js view()). Shared by the Standings
   page — where duelists answer and everyone else watches — and Command's
   Tiebreak panel, which projects it and runs the rounds. The server owns the
   clock; the countdown here only animates the time it reported. */

// Milliseconds left in the open round, ticking locally from the last poll.
export function useDuelCountdown(duel) {
  const deadline = useRef(0);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    deadline.current = Date.now() + (duel?.remaining_ms ?? 0);
    setLeft(duel?.remaining_ms ?? 0);
  }, [duel?.id, duel?.round, duel?.remaining_ms]);

  useEffect(() => {
    if (!duel || duel.status !== 'live' || duel.round_closed) return undefined;
    const timer = setInterval(() => setLeft(Math.max(0, deadline.current - Date.now())), 100);
    return () => clearInterval(timer);
  }, [duel?.id, duel?.round, duel?.status, duel?.round_closed]);

  return left;
}

// How often to poll: fast while a round can change under you, slow otherwise.
export function duelPollMs(duel) {
  if (duel?.status === 'live') return 1000;
  if (duel?.status === 'ready') return 3000;
  return 15000;
}

function roundLabel(duel) {
  if (duel.status === 'ready') return `${duel.regulation_rounds} ROUNDS · STANDING BY`;
  if (duel.sudden_death) return `SUDDEN DEATH · ROUND ${duel.round}`;
  return `ROUND ${duel.round} / ${duel.regulation_rounds}`;
}

export default function DuelStage({ duel, meId = null, onAnswer = null, error = '', children = null }) {
  const left = useDuelCountdown(duel);
  const [pending, setPending] = useState(null);

  useEffect(() => { setPending(null); }, [duel?.id, duel?.round]);

  if (!duel) return null;
  const finished = duel.status === 'finished';
  const open = duel.status === 'live' && !duel.round_closed;
  const canAnswer = !!onAnswer && duel.is_participant && open && !duel.my_answer && !pending;
  const picked = duel.my_answer?.choice ?? pending;
  const winner = duel.participants.find((p) => p.id === duel.winner_id);
  const timerPct = open ? (left / duel.round_ms) * 100 : 0;

  const choose = async (optionId) => {
    if (!canAnswer) return;
    setPending(optionId);
    try { await onAnswer(optionId); } catch { setPending(null); }
  };

  const optionState = (o) => {
    if (duel.question?.correct) {
      if (o.id === duel.question.correct) return ' correct';
      if (o.id === picked) return ' wrong';
      return ' faded';
    }
    return o.id === picked ? ' picked' : '';
  };

  return (
    <section className="duel-stage" aria-live="polite">
      <header className="duel-head">
        <span className="duel-bolt" aria-hidden="true">⚡</span>
        <span className="duel-title">LIGHTNING ROUND · FIRST-PLACE TIEBREAK</span>
        {duel.practice && <span className="duel-tag">PRACTICE</span>}
        {!finished && <span className="duel-round">{roundLabel(duel)}</span>}
      </header>

      <div className="duel-scores">
        {duel.participants.map((p) => (
          <div key={p.id} className={`duel-player${p.id === meId ? ' me' : ''}${finished && p.id === duel.winner_id ? ' winner' : ''}`}>
            <div className="duel-player-name">
              {finished && p.id === duel.winner_id ? '🏆 ' : ''}{p.name}
              {p.id === meId && <span className="ops-board-you">YOU</span>}
            </div>
            {p.squad && <div className="duel-player-squad">{p.squad}</div>}
            <div className="duel-player-total">{p.total}</div>
            <div className="duel-player-status">
              {open
                ? (p.locked_in ? 'LOCKED IN' : 'THINKING…')
                : p.last
                  ? (p.last.correct ? `+${p.last.points}` : 'MISSED')
                  : finished ? (p.id === duel.winner_id ? 'WINNER' : '') : 'READY'}
            </div>
          </div>
        ))}
      </div>

      {finished ? (
        <div className="duel-result">
          <div className="duel-result-name">{winner?.name ?? 'Winner'}</div>
          <div className="duel-result-sub">
            {duel.practice
              ? 'wins the practice duel'
              : `takes first place on the Operators board after ${duel.rounds.length} round${duel.rounds.length === 1 ? '' : 's'}`}
          </div>
        </div>
      ) : duel.status === 'ready' || !duel.question ? (
        <div className="duel-waiting">
          {duel.is_participant
            ? 'You are tied for first. Ten timed questions on the case: a correct answer scores 100 points plus up to 50 for speed. Highest total wins. Wait for the instructor to start round 1.'
            : 'Waiting for the instructor to start round 1.'}
        </div>
      ) : (
        <>
          <div className="duel-timer" aria-hidden="true">
            <div className="duel-timer-fill" style={{ width: `${timerPct}%` }} />
          </div>
          <div className="duel-clock">{open ? `${Math.ceil(left / 1000)}s` : 'TIME'}</div>
          <div className="duel-question">{duel.question.stem}</div>
          <div className="duel-options">
            {duel.question.options.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`duel-option${optionState(o)}`}
                onClick={() => choose(o.id)}
                disabled={!canAnswer}
              >
                <span className="duel-option-key">{o.id.toUpperCase()}</span>
                <span>{o.text}</span>
              </button>
            ))}
          </div>
          {duel.is_participant && onAnswer && (
            <div className="duel-note">
              {duel.round_closed
                ? (duel.my_answer?.correct ? `Correct, +${duel.my_answer.points}` : duel.my_answer ? 'Not this time.' : 'Time ran out.')
                : picked ? 'Locked in. Waiting for the round to close…' : 'Pick fast: the quicker the right answer, the more it scores.'}
            </div>
          )}
          {duel.round_closed && !duel.is_participant && <div className="duel-note">Round over. Next question coming up.</div>}
        </>
      )}

      {error && <div className="duel-error">{error}</div>}
      {children}
    </section>
  );
}
