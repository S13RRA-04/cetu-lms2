import { useState, useMemo, useCallback } from 'react';
import { updateProgress } from '../api/pact.js';

/* ── helpers ── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

function MultipleChoice({ q, shuffledOpts, selected, onToggle, revealed, forced, lastWrong }) {
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
            <span>{opt.text.en}</span>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalse({ q, selected, onSelect, revealed, forced }) {
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

function DragMatch({ q, matchState, onMatch, revealed, forced, partialFeedback }) {
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
              {src.text.en}
              {isMapped && !locked && <span className="qz-dm-clear"> ×</span>}
            </div>
          );
        })}
      </div>

      <div className="qz-dm-col">
        <div className="qz-dm-label">Tactics</div>
        {q.payload.targets.map((tgt) => {
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
              <span className="qz-dm-tgt-label">{tgt.text.en}</span>
              {placedSrc && <span className="qz-dm-placed-chip">{placedSrc.text.en}</span>}
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
                <span>{src?.text.en}</span>
                <span className="qz-dm-arrow">→</span>
                <span>{tgt?.text.en}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FillBlank({ q, value, onChange, revealed, forced }) {
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

export default function QuizFlow({ questions, assignmentId, color, onComplete }) {
  const shuffledOpts = useMemo(() =>
    questions.map((q) =>
      q.payload.kind === 'multiple_choice' && q.payload.shuffle
        ? shuffle(q.payload.options)
        : (q.payload.options ?? [])
    ), [questions]);

  const [qIdx,    setQIdx]    = useState(0);
  const [answers, setAnswers] = useState({});  // questionId → raw answer

  /* Per-question state */
  const [qStates, setQStates] = useState(() =>
    Object.fromEntries(questions.map((q) => [q.id, {
      available:   q.scoring.points, // points currently available
      hintUsed:    false,
      hintVisible: false,
      revealed:    false,            // correct answer submitted
      forced:      false,            // ran out of points
      lastWrong:   false,            // show "wrong, try again" banner
      partialFeedback: null,         // drag_match wrong-placement hints
    }]))
  );

  const q   = questions[qIdx];
  const qs  = qStates[q.id];
  const raw = answers[q.id];

  const isLast   = qIdx === questions.length - 1;
  const answered = questions.filter((qi) => qStates[qi.id]?.revealed || qStates[qi.id]?.forced).length;

  const locked = qs.revealed || qs.forced;

  /* ── answer helpers ── */
  const updateAnswer = useCallback((val) => {
    setAnswers((a) => ({ ...a, [q.id]: val }));
  }, [q.id]);

  const toggleOption = useCallback((optId) => {
    const current = answers[q.id] ?? [];
    if (q.payload.selectionMode === 'single') {
      updateAnswer([optId]);
    } else {
      updateAnswer(current.includes(optId)
        ? current.filter((id) => id !== optId)
        : [...current, optId]);
    }
  }, [answers, q, updateAnswer]);

  const hasAnswer = useCallback(() => {
    const p = q.payload;
    if (p.kind === 'multiple_choice') return (raw ?? []).length > 0;
    if (p.kind === 'true_false')      return raw !== undefined;
    if (p.kind === 'drag_match')      return Object.keys(raw ?? {}).length === p.sources.length;
    if (p.kind === 'fill_blank')      return (raw ?? '').trim().length > 0;
    return false;
  }, [q, raw]);

  /* ── hint ── */
  const handleHint = useCallback(() => {
    setQStates((s) => {
      const cur = s[q.id];
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
  }, [q.id]);

  /* ── submit answer ── */
  const handleSubmit = useCallback(() => {
    const correct = isAnswerCorrect(q, raw);

    if (correct) {
      setQStates((s) => ({ ...s, [q.id]: { ...s[q.id], revealed: true, lastWrong: false } }));
      const pct = Math.round(((answered + 1) / questions.length) * 100);
      updateProgress(assignmentId, pct).catch(() => {});
    } else {
      setQStates((s) => {
        const cur      = s[q.id];
        const newAvail = Math.max(0, cur.available - 2);
        const doForce  = newAvail <= 0;

        /* clear selection on wrong (except drag_match — show placements) */
        if (!doForce && q.payload.kind !== 'drag_match') {
          setAnswers((a) => {
            const next = { ...a };
            if (q.payload.kind === 'true_false')  delete next[q.id];
            else                                   next[q.id] = q.payload.kind === 'fill_blank' ? '' : [];
            return next;
          });
        }

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
      if (qs.available - 2 <= 0) {
        const pct = Math.round(((answered + 1) / questions.length) * 100);
        updateProgress(assignmentId, pct).catch(() => {});
      }
    }
  }, [q, raw, qs, answered, questions.length, assignmentId]);

  /* ── advance to next / complete ── */
  const handleNext = useCallback(() => {
    if (isLast) {
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
      setQIdx((i) => i + 1);
    }
  }, [isLast, questions, qStates, answers, onComplete]);

  const totalEarned = questions.slice(0, qIdx).reduce((s, qi) => {
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

      {/* question card */}
      <div className="qz-card">
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
        <p className="qz-stem">{q.stem.en}</p>

        {/* forced-reveal banner */}
        {qs.forced && (
          <div className="qz-forced-banner">
            ✗ Out of points — correct answer shown below
          </div>
        )}

        {/* wrong-attempt banner */}
        {qs.lastWrong && !qs.forced && (
          <div className="qz-wrong-banner">
            ✗ Incorrect — {qs.available} pt{qs.available !== 1 ? 's' : ''} remaining. Try again.
          </div>
        )}

        {/* hint panel */}
        {qs.hintVisible && (
          <div className="qz-hint-panel">
            <span className="qz-hint-label">Hint</span>
            {q.feedback.reference}
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
              {qs.revealed ? `✓ Correct — +${qs.available} pts` : '✗ Answer revealed — 0 pts'}
            </div>
            <p className="qz-feedback-text">
              {qs.revealed ? q.feedback.correct.en : q.feedback.incorrect.en}
            </p>
            {q.feedback.reference && (
              <div className="qz-feedback-ref">↗ {q.feedback.reference}</div>
            )}
          </div>
        )}
      </div>

      {/* action buttons */}
      <div className="qz-actions">
        {locked ? (
          <button className="btn-submit" onClick={handleNext} style={{ background: color }}>
            {isLast ? 'See Results →' : 'Next Question →'}
          </button>
        ) : (
          <>
            <button
              className="btn-submit"
              onClick={handleSubmit}
              disabled={!hasAnswer()}
            >
              Submit Answer
            </button>
            {hasHint && (
              <button className="qz-hint-btn" onClick={handleHint}>
                💡 Use Hint <span className="qz-hint-cost">−1 pt</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
