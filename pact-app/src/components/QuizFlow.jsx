import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { updateProgress, getSquadChallengeState, saveSquadChallengeState } from '../api/pact.js';
import { loadDraftSync, clearDraftSync } from '../hooks/useDraft.js';

/* ── helpers ── */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── squad-shared state merge ──────────────────────────────────────────────
   Mirrors backend/src/services/squadChallengeState.service.js exactly — a
   question's state is owned by whichever side has resolved it (revealed or
   forced); if neither side has, the side with more attempts spent (lower
   `available`) wins so a stale push from one squad member can't clobber a
   teammate's further-along attempt on the same question. Hint usage is a
   one-way OR: once anyone in the squad spends the hint, it stays spent. */
function isResolved(qs) {
  return !!(qs && (qs.revealed || qs.forced));
}

/* Returns 'a' or 'b' — which side's qState (and answer) should win. Kept
   separate from the merged qState value itself because that value gets a
   fresh object spread (for the hintUsed OR), so it can never be compared by
   reference back to `a`/`b` to figure out which side supplied the answer —
   that reference-equality trick silently always resolved to 'b' for any
   question still in progress on both sides (the tie-break branch below always
   builds a new object), which is exactly the window where a student is mid-
   drag on a multi-part drag_match answer. Answers were getting replaced by
   whatever the other side last synced, every single reconciliation. */
function mergeQStateWinner(a, b) {
  if (!a) return 'b';
  if (!b) return 'a';
  const aResolved = isResolved(a);
  const bResolved = isResolved(b);
  if (aResolved && !bResolved) return 'a';
  if (bResolved && !aResolved) return 'b';
  if (aResolved && bResolved) return 'b';
  return (a.available ?? Infinity) <= (b.available ?? Infinity) ? 'a' : 'b';
}

function mergeQState(a, b) {
  const side   = mergeQStateWinner(a, b);
  const winner = side === 'a' ? a : b;
  if (!winner) return winner;
  return { ...winner, hintUsed: !!(a?.hintUsed || b?.hintUsed) };
}

function mergeQuizState(local, remote, questions) {
  const localQ  = local?.qStates ?? {};
  const remoteQ = remote?.qStates ?? {};
  const localA  = local?.answers ?? {};
  const remoteA = remote?.answers ?? {};

  const qStates = {};
  const answers = {};
  for (const q of questions) {
    const a = localQ[q.id];
    const b = remoteQ[q.id];
    const merged = mergeQState(a, b);
    if (merged) qStates[q.id] = merged;
    answers[q.id] = mergeQStateWinner(a, b) === 'a' ? localA[q.id] : remoteA[q.id];
  }

  let qIdx = questions.findIndex((q) => !isResolved(qStates[q.id]));
  if (qIdx === -1) qIdx = Math.max(0, questions.length - 1);

  return { qIdx, answers, qStates };
}

function sameQuizState(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isAnswerCorrect(q, raw) {
  const p = q.payload;
  if (p.kind === 'multiple_choice') {
    const correct  = new Set(p.correct);
    const selected = new Set(raw ?? []);
    if (p.selectionMode === 'single') {
      return selected.size === 1 && correct.has([...selected][0]);
    }
    return [...correct].every((id) => selected.has(id))
        && [...selected].every((id) => correct.has(id));
  }
  if (p.kind === 'true_false') {
    return raw === p.correct;
  }
  if (p.kind === 'drag_match') {
    const matchMap = Object.fromEntries(p.matches.map((m) => [m.sourceId, m.targetId]));
    const entries  = Object.entries(raw ?? {});
    return entries.length === p.matches.length
        && entries.every(([src, tgt]) => matchMap[src] === tgt);
  }
  if (p.kind === 'fill_blank') {
    const accepted = (p.blanks ?? []).flatMap((b) =>
      b.accepted.map((s) => b.caseSensitive ? s : s.toLowerCase())
    );
    const given = (raw ?? '').trim();
    const test  = p.blanks?.[0]?.caseSensitive ? given : given.toLowerCase();
    return accepted.includes(test);
  }
  return false;
}

/* drag_match: which sources are correctly placed (for partial feedback) */
function matchCorrectness(q, raw) {
  const matchMap = Object.fromEntries(q.payload.matches.map((m) => [m.sourceId, m.targetId]));
  const result   = {};
  Object.entries(raw ?? {}).forEach(([src, tgt]) => {
    result[src] = matchMap[src] === tgt;
  });
  return result;
}

/* ── question components ── */

export function MultipleChoice({ q, shuffledOpts, selected, onToggle, revealed, forced, lastWrong }) {
  const multi = q.payload.selectionMode === 'multiple';
  return (
    <div className="qz-options">
      {shuffledOpts.map((opt) => {
        const isSelected = (selected ?? []).includes(opt.id);
        const isCorrect  = q.payload.correct.includes(opt.id);
        let cls = 'qz-option';
        if (isSelected) cls += ' qz-selected';
        if (revealed || forced) {
          if (isCorrect)             cls += ' qz-correct-opt';
          else if (isSelected)       cls += ' qz-wrong-opt';
        }
        return (
          <button
            key={opt.id}
            className={cls}
            onClick={() => !(revealed || forced) && onToggle(opt.id)}
            disabled={revealed || forced}
          >
            <span className="qz-opt-marker">{multi ? '☐' : '○'}</span>
            {isSelected && !(revealed || forced) && (
              <span className="qz-opt-marker qz-opt-filled">{multi ? '☑' : '●'}</span>
            )}
            {(revealed || forced) && isCorrect         && <span className="qz-opt-marker qz-opt-filled">✓</span>}
            {(revealed || forced) && !isCorrect && isSelected && <span className="qz-opt-marker qz-opt-filled">✗</span>}
            <span>{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TrueFalse({ q, selected, onSelect, revealed, forced }) {
  const correct = q.payload.correct;
  return (
    <div className="qz-tf-row">
      {[true, false].map((val) => {
        const label  = val ? 'True' : 'False';
        const isSel  = selected === val;
        const isCorr = correct === val;
        let cls = 'qz-tf-btn';
        if (isSel) cls += ' qz-selected';
        if (revealed || forced) {
          if (isCorr)           cls += ' qz-correct-opt';
          else if (isSel)       cls += ' qz-wrong-opt';
        }
        return (
          <button
            key={label}
            className={cls}
            onClick={() => !(revealed || forced) && onSelect(val)}
            disabled={revealed || forced}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function DragMatch({ q, targets, matchState, onMatch, revealed, forced, partialFeedback }) {
  const [dragging, setDragging] = useState(null);
  const [pending,  setPending]  = useState(null);

  const matchMap  = Object.fromEntries(q.payload.matches.map((m) => [m.sourceId, m.targetId]));
  const assigned  = matchState ?? {};
  const locked    = revealed || forced;

  const handleDrop = (targetId) => {
    if (!dragging || locked) return;
    onMatch({ ...assigned, [dragging]: targetId });
    setDragging(null);
  };
  const handleSourceClick = (srcId) => {
    if (locked) return;
    if (pending === srcId) { setPending(null); return; }
    setPending(srcId);
  };
  const handleTargetClick = (tgtId) => {
    if (locked || !pending) return;
    onMatch({ ...assigned, [pending]: tgtId });
    setPending(null);
  };
  const clearSlot = (srcId) => {
    if (locked) return;
    const next = { ...assigned };
    delete next[srcId];
    onMatch(next);
  };

  const assignedByTarget = {};
  Object.entries(assigned).forEach(([src, tgt]) => { assignedByTarget[tgt] = src; });

  return (
    <div className="qz-dragmatch">
      <div className="qz-dm-col">
        <div className="qz-dm-label">Actions</div>
        {q.payload.sources.map((src) => {
          const isMapped = src.id in assigned;
          const isActive = pending === src.id;
          let cls = 'qz-dm-source';
          if (isMapped)  cls += ' qz-dm-placed';
          if (isActive)  cls += ' qz-dm-active';
          if (locked) {
            const placedIn = assigned[src.id];
            if (placedIn && matchMap[src.id] === placedIn) cls += ' qz-correct-opt';
            else if (placedIn)                              cls += ' qz-wrong-opt';
          } else if (partialFeedback && src.id in partialFeedback) {
            cls += partialFeedback[src.id] ? ' qz-soft-correct' : ' qz-soft-wrong';
          }
          return (
            <div
              key={src.id}
              className={cls}
              draggable={!locked && !isMapped}
              onDragStart={() => setDragging(src.id)}
              onDragEnd={() => setDragging(null)}
              onClick={() => isMapped ? clearSlot(src.id) : handleSourceClick(src.id)}
            >
              {src.text}
              {isMapped && !locked && <span className="qz-dm-clear"> ×</span>}
            </div>
          );
        })}
      </div>

      <div className="qz-dm-col">
        <div className="qz-dm-label">Tactics</div>
        {(targets ?? q.payload.targets).map((tgt) => {
          const placedSrcId = assignedByTarget[tgt.id];
          const placedSrc   = q.payload.sources.find((s) => s.id === placedSrcId);
          let slotCls = 'qz-dm-target';
          if (dragging && !locked)  slotCls += ' qz-dm-over';
          if (pending && !locked)   slotCls += ' qz-dm-clickable';
          if (locked && placedSrcId) {
            slotCls += matchMap[placedSrcId] === tgt.id ? ' qz-correct-opt' : ' qz-wrong-opt';
          }
          return (
            <div
              key={tgt.id}
              className={slotCls}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(tgt.id)}
              onClick={() => handleTargetClick(tgt.id)}
            >
              <span className="qz-dm-tgt-label">{tgt.text}</span>
              {placedSrc && <span className="qz-dm-placed-chip">{placedSrc.text}</span>}
            </div>
          );
        })}
      </div>

      {locked && (
        <div className="qz-dm-key">
          <div className="qz-dm-label">Answer key</div>
          {q.payload.matches.map((m) => {
            const src = q.payload.sources.find((s) => s.id === m.sourceId);
            const tgt = q.payload.targets.find((t) => t.id === m.targetId);
            return (
              <div key={m.sourceId} className="qz-dm-key-row">
                <span>{src?.text}</span>
                <span className="qz-dm-arrow">→</span>
                <span>{tgt?.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FillBlank({ q, value, onChange, revealed, forced }) {
  const locked = revealed || forced;
  return (
    <div className="qz-fillblank">
      <input
        className={`qz-blank-input${locked ? (revealed ? ' qz-correct-opt' : ' qz-wrong-opt') : ''}`}
        value={value ?? ''}
        onChange={(e) => !locked && onChange(e.target.value)}
        placeholder="Type your answer…"
        disabled={locked}
      />
      {forced && (
        <div className="qz-forced-answer">
          Accepted: {q.payload.blanks?.[0]?.accepted?.join(' / ')}
        </div>
      )}
    </div>
  );
}

/* ── main component ── */

export default function QuizFlow({ questions, assignmentId, color, onComplete, submitting = false, squadShared = false, initialSquadState = null }) {
  /* Randomize presentation order so the correct answer's position can't be
     guessed from the option/target list alone (e.g. "always A", dropdowns
     always in correct order). Shuffle is opt-out, not opt-in — a question
     must explicitly set shuffle: false to keep a fixed order. */
  const shuffledOpts = useMemo(() =>
    questions.map((q) =>
      q.payload.kind === 'multiple_choice' && q.payload.shuffle !== false
        ? shuffle(q.payload.options)
        : (q.payload.options ?? [])
    ), [questions]);

  const shuffledTargets = useMemo(() =>
    questions.map((q) =>
      q.payload.kind === 'drag_match' && q.payload.shuffle !== false
        ? shuffle(q.payload.targets)
        : (q.payload.targets ?? [])
    ), [questions]);

  /* Restore draft on mount — load synchronously inside initializers. Squad-
     shared challenges seed from the squad's server-side state (fetched by
     AssignmentPage before mount) instead of this device's own localStorage
     draft — the whole point is starting wherever the squad collectively left
     off, not wherever this one student last was. */
  const draft = useMemo(() => {
    const currentIds = questions.map((q) => q.id).sort().join(',');
    if (squadShared) {
      if (!initialSquadState?.qStates) return null;
      const ids = Object.keys(initialSquadState.qStates).sort().join(',');
      return ids === currentIds ? initialSquadState : null;
    }
    const d = loadDraftSync(assignmentId);
    if (!d?.qStates) return null;
    /* Discard draft if question set has changed */
    const draftIds = Object.keys(d.qStates).sort().join(',');
    return draftIds === currentIds ? d : null;
  }, []); // intentionally run once on mount

  const [qIdx,    setQIdx]    = useState(draft?.qIdx    ?? 0);
  const [answers, setAnswers] = useState(draft?.answers ?? {});
  const [saveError, setSaveError] = useState(false);
  const cardRef = useRef(null);

  const [qStates, setQStates] = useState(() =>
    draft?.qStates ?? Object.fromEntries(questions.map((q) => [q.id, {
      available:       q.scoring.points,
      hintUsed:        false,
      hintVisible:     false,
      revealed:        false,
      forced:          false,
      lastWrong:       false,
      partialFeedback: null,
    }]))
  );

  /* Draft to localStorage on every change, including raw answer selection —
     cheap, no network, keeps an in-progress (not-yet-submitted) pick safe
     across an accidental refresh. */
  useEffect(() => {
    try {
      const data = JSON.stringify({ qIdx, answers, qStates, _ts: Date.now() });
      localStorage.setItem(`pact_draft_${assignmentId}`, data);
    } catch {}
  }, [qIdx, answers, qStates, assignmentId]);

  /* Sync progress to the backend only at meaningful transitions (a question
     resolving, a hint spent, an attempt consumed) — deliberately NOT on every
     raw answer click (`answers` is read via closure, not listed as a
     dependency), so this doesn't fire on every checkbox toggle. Two things
     ride on this sync:
       1. The full quiz_state is attached to the student's own Submission row,
          which is what powers Command's Live Progress view showing a
          student's live score/accuracy, not just a flat percentage.
       2. For squad-graded challenges, the same state is pushed to the squad's
          shared state and merged server-side (mirrored by mergeQuizState
          above) — this converges rather than loops: once what we're about to
          push matches what we already know the server has, we stop pushing
          until something actually changes again. */
  const lastSyncedRef = useRef(null);
  useEffect(() => {
    const answeredCount = questions.filter((qi) => qStates[qi.id]?.revealed || qStates[qi.id]?.forced).length;
    const pct = Math.round((answeredCount / questions.length) * 100);

    updateProgress(assignmentId, pct, { qIdx, answers, qStates })
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true));

    if (!squadShared) return;
    const payload    = { qIdx, answers, qStates };
    const payloadKey = JSON.stringify(payload);
    if (payloadKey === lastSyncedRef.current) return;
    lastSyncedRef.current = payloadKey;

    saveSquadChallengeState(assignmentId, payload).then((merged) => {
      if (!merged) return;
      /* Reconcile against LIVE local state, not the `payload` snapshot this
         push started from — the round trip is async, so the student may have
         already clicked further (e.g. selecting options on the next
         multi-select question) before this response lands. Treating the
         server's reply as just another remote side to merge (same as the
         live-poll below) lets those newer, unsynced local edits win instead
         of being clobbered by a stale echo of what we just sent. */
      const remoteState = { qIdx: merged.qIdx, answers: merged.answers, qStates: merged.qStates };
      const cur = liveStateRef.current;
      const reconciled = mergeQuizState(cur, remoteState, questions);
      lastSyncedRef.current = JSON.stringify(reconciled);
      if (sameQuizState(reconciled, cur)) return;
      setQIdx(reconciled.qIdx);
      setAnswers(reconciled.answers);
      setQStates(reconciled.qStates);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx, qStates, assignmentId, squadShared, questions]);

  /* Live-poll for progress made by other squad members — merges in anything
     the squad has resolved since the last sync so a teammate solving the
     question currently on screen auto-advances this student too, not just on
     next page load. */
  const liveStateRef = useRef({ qIdx, answers, qStates });
  useEffect(() => { liveStateRef.current = { qIdx, answers, qStates }; }, [qIdx, answers, qStates]);

  useEffect(() => {
    if (!squadShared) return;
    const poll = () => {
      getSquadChallengeState(assignmentId).then((remote) => {
        if (!remote?.qStates) return;
        const cur    = liveStateRef.current;
        const merged = mergeQuizState(cur, remote, questions);
        if (sameQuizState(merged, cur)) return;
        setQIdx(merged.qIdx);
        setAnswers(merged.answers);
        setQStates(merged.qStates);
      }).catch(() => {});
    };
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, [assignmentId, squadShared, questions]);

  const q   = questions[qIdx];
  const qs  = q ? qStates[q.id] : null;
  const raw = q ? answers[q.id] : null;

  const isLast   = qIdx === questions.length - 1;
  const answered = questions.filter((qi) => qStates[qi.id]?.revealed || qStates[qi.id]?.forced).length;
  const locked   = qs?.revealed || qs?.forced;

  /* ── answer helpers ── */
  const updateAnswer = useCallback((val) => {
    setAnswers((a) => ({ ...a, [q?.id]: val }));
  }, [q?.id]);

  const toggleOption = useCallback((optId) => {
    const current = answers[q?.id] ?? [];
    if (q?.payload.selectionMode === 'single') {
      updateAnswer([optId]);
    } else {
      updateAnswer(current.includes(optId)
        ? current.filter((id) => id !== optId)
        : [...current, optId]);
    }
  }, [answers, q, updateAnswer]);

  const hasAnswer = useCallback(() => {
    const p = q?.payload;
    if (!p) return false;
    if (p.kind === 'multiple_choice') return (raw ?? []).length > 0;
    if (p.kind === 'true_false')      return raw !== undefined;
    if (p.kind === 'drag_match')      return Object.keys(raw ?? {}).length === p.sources.length;
    if (p.kind === 'fill_blank')      return (raw ?? '').trim().length > 0;
    return false;
  }, [q, raw]);

  /* ── hint ── */
  const handleHint = useCallback(() => {
    setQStates((s) => {
      const cur = s[q?.id];
      if (!cur) return s;
      const newAvail = Math.max(0, cur.available - 1);
      return {
        ...s,
        [q.id]: {
          ...cur,
          hintUsed:    true,
          hintVisible: true,
          available:   newAvail,
          forced:      newAvail === 0,
        },
      };
    });
  }, [q?.id]);

  /* ── submit answer ── */
  const handleSubmit = useCallback(() => {
    if (!q || !qs) return;
    const correct = isAnswerCorrect(q, raw);

    if (correct) {
      setQStates((s) => ({ ...s, [q.id]: { ...s[q.id], revealed: true, lastWrong: false } }));
    } else {
      /* shake the card */
      if (cardRef.current) {
        cardRef.current.classList.remove('qz-card-shake');
        void cardRef.current.offsetWidth; // force reflow
        cardRef.current.classList.add('qz-card-shake');
      }
      setQStates((s) => {
        const cur      = s[q.id];
        const newAvail = Math.max(0, cur.available - 2);
        const doForce  = newAvail <= 0;

        /* Keep the student's selection in place on a wrong attempt — they should
           be able to adjust their answer, not re-enter it from scratch. */

        return {
          ...s,
          [q.id]: {
            ...cur,
            available:       newAvail,
            forced:          doForce,
            lastWrong:       !doForce,
            partialFeedback: q.payload.kind === 'drag_match' ? matchCorrectness(q, raw) : null,
          },
        };
      });
    }
  }, [q, raw, qs]);

  /* ── advance to next / complete ── */
  const handleNext = useCallback(() => {
    if (qIdx >= questions.length - 1) {
      clearDraftSync(assignmentId);
      const total    = questions.reduce((s, qi) => {
        const st = qStates[qi.id];
        return s + (st?.revealed ? st.available : 0);
      }, 0);
      const maxTotal = questions.reduce((s, qi) => s + qi.scoring.points, 0);
      onComplete({
        answers: questions.map((qi) => {
          const st = qStates[qi.id];
          return {
            questionId: qi.id,
            raw:        answers[qi.id],
            isCorrect:  !!st?.revealed,
            points:     st?.revealed ? st.available : 0,
          };
        }),
        totalScore: total,
        maxScore:   maxTotal,
      });
    } else {
      setQIdx((i) => Math.min(i + 1, questions.length - 1));
    }
  }, [qIdx, questions, qStates, answers, onComplete]);

  /* All hooks must be called before any conditional return */
  if (!q || !qs) return null;

  /* Count ALL answered questions so score updates immediately on correct answer,
     not again when advancing — avoids the "double-count" perception. */
  const totalEarned = questions.reduce((s, qi) => {
    const st = qStates[qi.id];
    return s + (st?.revealed ? st.available : 0);
  }, 0);

  const hasHint = !!q.feedback?.reference && !qs.hintUsed && !locked;

  return (
    <div className="qz-wrap">
      {/* progress bar */}
      <div className="qz-progress-row">
        <div className="qz-progress-track">
          <div
            className="qz-progress-fill"
            style={{ width: `${(answered / questions.length) * 100}%`, background: color }}
          />
        </div>
        <span className="qz-progress-label">{answered} / {questions.length}</span>
        {answered > 0 && (
          <span className="qz-score-running" style={{ color }}>{totalEarned} pts</span>
        )}
      </div>
      {saveError && (
        <div className="qz-save-warning">
          Progress isn't syncing to the server right now — your answers are safe on this device and will sync automatically once the connection recovers.
        </div>
      )}

      {/* question card with slide transition between questions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={qIdx}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="qz-card" ref={cardRef}>
            {/* header */}
            <div className="qz-card-header">
              <span className="qz-q-num" style={{ color }}>Q{qIdx + 1}</span>
              {q.scoring.mustPass && <span className="qz-must-pass">Must Pass</span>}
              <div className="qz-pts-group">
                {qs.available < q.scoring.points && (
                  <span className="qz-pts-orig">{q.scoring.points}</span>
                )}
                <span
                  className="qz-pts"
                  style={{ color: qs.available < q.scoring.points ? (qs.available === 0 ? '#ef4444' : '#f59e0b') : undefined }}
                >
                  {qs.available} pt{qs.available !== 1 ? 's' : ''} available
                </span>
              </div>
            </div>

            {/* stem */}
            <p className="qz-stem">{q.stem}</p>

            {/* forced-reveal banner */}
            {qs.forced && (
              <div className="qz-forced-banner">
                OUT OF ATTEMPTS — correct answer shown below
              </div>
            )}

            {/* wrong-attempt banner */}
            {qs.lastWrong && !qs.forced && (
              <div className="qz-wrong-banner">
                INCORRECT — {qs.available} pt{qs.available !== 1 ? 's' : ''} remaining. Try again.
              </div>
            )}

            {/* intel brief (hint) panel */}
            {qs.hintVisible && (
              <div className="qz-hint-panel">
                <span className="qz-hint-label">INTEL BRIEF</span>
                {q.feedback?.reference}
              </div>
            )}

            {/* answer widget */}
            {q.payload.kind === 'multiple_choice' && (
              <MultipleChoice
                q={q}
                shuffledOpts={shuffledOpts[qIdx]}
                selected={raw}
                onToggle={toggleOption}
                revealed={qs.revealed}
                forced={qs.forced}
              />
            )}
            {q.payload.kind === 'true_false' && (
              <TrueFalse
                q={q}
                selected={raw}
                onSelect={updateAnswer}
                revealed={qs.revealed}
                forced={qs.forced}
              />
            )}
            {q.payload.kind === 'drag_match' && (
              <DragMatch
                q={q}
                targets={shuffledTargets[qIdx]}
                matchState={raw}
                onMatch={updateAnswer}
                revealed={qs.revealed}
                forced={qs.forced}
                partialFeedback={qs.partialFeedback}
              />
            )}
            {q.payload.kind === 'fill_blank' && (
              <FillBlank
                q={q}
                value={raw}
                onChange={updateAnswer}
                revealed={qs.revealed}
                forced={qs.forced}
              />
            )}

            {/* final feedback (correct or forced) */}
            {locked && (
              <div className={`qz-feedback ${qs.revealed ? 'qz-feedback-correct' : 'qz-feedback-wrong'}`}>
                <div className="qz-feedback-verdict">
                  {qs.revealed ? `✓ CONFIRMED — +${qs.available} pts` : '✗ ANSWER REVEALED — 0 pts'}
                </div>
                <p className="qz-feedback-text">
                  {qs.revealed ? q.feedback?.correct : q.feedback?.incorrect}
                </p>
                {q.feedback?.reference && (
                  <div className="qz-feedback-ref">↗ {q.feedback.reference}</div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* action buttons */}
      <div className="qz-actions">
        {locked ? (
          <button
            className="btn-submit"
            onClick={handleNext}
            disabled={isLast && submitting}
            style={(isLast && submitting) ? {} : { background: color }}
          >
            {isLast ? (submitting ? 'SUBMITTING…' : 'COMPLETE ASSESSMENT →') : 'NEXT →'}
          </button>
        ) : (
          <>
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={!hasAnswer()}
              style={hasAnswer() ? { background: color } : {}}
            >
              SUBMIT RESPONSE
            </button>
            {hasHint && (
              <button className="qz-hint-btn" onClick={handleHint}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                REQUEST INTEL <span className="qz-hint-cost">−1 pt</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
