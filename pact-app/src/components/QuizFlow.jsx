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

function scoreAnswer(q, raw) {
  const p = q.payload;
  if (p.kind === 'multiple_choice') {
    const correct = new Set(p.correct);
    const selected = new Set(raw ?? []);
    if (p.selectionMode === 'single') {
      return { isCorrect: selected.size === 1 && correct.has([...selected][0]), points: q.scoring.points };
    }
    // multiple select — all correct, none wrong
    const allRight = [...correct].every((id) => selected.has(id));
    const noneWrong = [...selected].every((id) => correct.has(id));
    return { isCorrect: allRight && noneWrong, points: q.scoring.points };
  }
  if (p.kind === 'true_false') {
    return { isCorrect: raw === p.correct, points: q.scoring.points };
  }
  if (p.kind === 'drag_match') {
    const matchMap = Object.fromEntries(p.matches.map((m) => [m.sourceId, m.targetId]));
    const total = p.matches.length;
    const correct = Object.entries(raw ?? {}).filter(([src, tgt]) => matchMap[src] === tgt).length;
    if (p.partialCredit) {
      const pts = Math.round((correct / total) * q.scoring.points);
      return { isCorrect: correct === total, points: pts, correct, total };
    }
    const ok = correct === total;
    return { isCorrect: ok, points: ok ? q.scoring.points : 0, correct, total };
  }
  if (p.kind === 'fill_blank') {
    const accepted = (p.blanks ?? []).flatMap((b) =>
      b.accepted.map((s) => b.caseSensitive ? s : s.toLowerCase())
    );
    const given = (raw ?? '').trim();
    const test  = p.blanks?.[0]?.caseSensitive ? given : given.toLowerCase();
    return { isCorrect: accepted.includes(test), points: q.scoring.points };
  }
  return { isCorrect: false, points: 0 };
}

/* ── question components ── */

function MultipleChoice({ q, shuffledOpts, selected, onToggle, revealed, scoreResult }) {
  const multi = q.payload.selectionMode === 'multiple';
  return (
    <div className="qz-options">
      {shuffledOpts.map((opt) => {
        const isSelected = (selected ?? []).includes(opt.id);
        const isCorrect  = q.payload.correct.includes(opt.id);
        let cls = 'qz-option';
        if (isSelected) cls += ' qz-selected';
        if (revealed) {
          if (isCorrect)  cls += ' qz-correct-opt';
          else if (isSelected) cls += ' qz-wrong-opt';
        }
        return (
          <button
            key={opt.id}
            className={cls}
            onClick={() => !revealed && onToggle(opt.id)}
            disabled={revealed}
          >
            <span className="qz-opt-marker">{multi ? '☐' : '○'}</span>
            {isSelected && !revealed && <span className="qz-opt-marker qz-opt-filled">{multi ? '☑' : '●'}</span>}
            {revealed && isCorrect   && <span className="qz-opt-marker qz-opt-filled">✓</span>}
            {revealed && !isCorrect && isSelected && <span className="qz-opt-marker qz-opt-filled">✗</span>}
            <span>{opt.text.en}</span>
          </button>
        );
      })}
    </div>
  );
}

function TrueFalse({ q, selected, onSelect, revealed, scoreResult }) {
  const correct = q.payload.correct;
  return (
    <div className="qz-tf-row">
      {[true, false].map((val) => {
        const label    = val ? 'True' : 'False';
        const isSel    = selected === val;
        const isCorr   = correct === val;
        let cls = 'qz-tf-btn';
        if (isSel) cls += ' qz-selected';
        if (revealed && isCorr)  cls += ' qz-correct-opt';
        if (revealed && isSel && !isCorr) cls += ' qz-wrong-opt';
        return (
          <button key={label} className={cls} onClick={() => !revealed && onSelect(val)} disabled={revealed}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function DragMatch({ q, matchState, onMatch, revealed, scoreResult }) {
  const [dragging, setDragging] = useState(null);
  const [pending, setPending]   = useState(null); // for click-to-assign

  const matchMap = Object.fromEntries(q.payload.matches.map((m) => [m.sourceId, m.targetId]));
  const assigned = matchState ?? {};

  const handleDrop = (targetId) => {
    if (!dragging || revealed) return;
    onMatch({ ...assigned, [dragging]: targetId });
    setDragging(null);
  };
  const handleSourceClick = (srcId) => {
    if (revealed) return;
    if (pending === srcId) { setPending(null); return; }
    setPending(srcId);
  };
  const handleTargetClick = (tgtId) => {
    if (revealed || !pending) return;
    onMatch({ ...assigned, [pending]: tgtId });
    setPending(null);
  };
  const clearSlot = (srcId) => {
    if (revealed) return;
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
          const isMapped    = src.id in assigned;
          const isActive    = pending === src.id;
          let cls = 'qz-dm-source';
          if (isMapped) cls += ' qz-dm-placed';
          if (isActive) cls += ' qz-dm-active';
          if (revealed) {
            const placedIn = assigned[src.id];
            if (placedIn && matchMap[src.id] === placedIn) cls += ' qz-correct-opt';
            else if (placedIn) cls += ' qz-wrong-opt';
          }
          return (
            <div
              key={src.id}
              className={cls}
              draggable={!revealed && !isMapped}
              onDragStart={() => setDragging(src.id)}
              onDragEnd={() => setDragging(null)}
              onClick={() => isMapped ? clearSlot(src.id) : handleSourceClick(src.id)}
            >
              {src.text.en}
              {isMapped && !revealed && <span className="qz-dm-clear" title="Remove"> ×</span>}
            </div>
          );
        })}
      </div>

      <div className="qz-dm-col">
        <div className="qz-dm-label">Tactics</div>
        {q.payload.targets.map((tgt) => {
          const placedSrcId = assignedByTarget[tgt.id];
          const placedSrc   = q.payload.sources.find((s) => s.id === placedSrcId);
          const isOver      = dragging && !revealed;
          let slotCls = 'qz-dm-target';
          if (isOver) slotCls += ' qz-dm-over';
          if (pending && !revealed) slotCls += ' qz-dm-clickable';
          if (revealed && placedSrcId) {
            slotCls += matchMap[placedSrcId] === tgt.id ? ' qz-correct-opt' : ' qz-wrong-opt';
          }
          return (
            <div
              key={tgt.id}
              className={slotCls}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={() => handleDrop(tgt.id)}
              onClick={() => handleTargetClick(tgt.id)}
            >
              <span className="qz-dm-tgt-label">{tgt.text.en}</span>
              {placedSrc && (
                <span className="qz-dm-placed-chip">{placedSrc.text.en}</span>
              )}
            </div>
          );
        })}
      </div>

      {revealed && (
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

function FillBlank({ q, value, onChange, revealed, scoreResult }) {
  return (
    <div className="qz-fillblank">
      <input
        className={`qz-blank-input${revealed ? (scoreResult?.isCorrect ? ' qz-correct-opt' : ' qz-wrong-opt') : ''}`}
        value={value ?? ''}
        onChange={(e) => !revealed && onChange(e.target.value)}
        placeholder="Type your answer…"
        disabled={revealed}
      />
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

  const [qIdx,     setQIdx]     = useState(0);
  const [answers,  setAnswers]  = useState({});   // questionId → raw answer
  const [scores,   setScores]   = useState({});   // questionId → { isCorrect, points }
  const [revealed, setRevealed] = useState(false);

  const q          = questions[qIdx];
  const raw        = answers[q.id];
  const scoreResult = scores[q.id];
  const isLast     = qIdx === questions.length - 1;
  const answered   = Object.keys(scores).length;

  const hasAnswer = useCallback(() => {
    const p = q.payload;
    if (p.kind === 'multiple_choice') return (raw ?? []).length > 0;
    if (p.kind === 'true_false')      return raw !== undefined;
    if (p.kind === 'drag_match')      return Object.keys(raw ?? {}).length === p.sources.length;
    if (p.kind === 'fill_blank')      return (raw ?? '').trim().length > 0;
    return false;
  }, [q, raw]);

  const handleReveal = useCallback(() => {
    const result = scoreAnswer(q, raw);
    setScores((s) => ({ ...s, [q.id]: result }));
    setRevealed(true);
    const pct = Math.round(((answered + 1) / questions.length) * 100);
    updateProgress(assignmentId, pct).catch(() => {});
  }, [q, raw, answered, questions.length, assignmentId]);

  const handleNext = useCallback(() => {
    if (isLast) {
      const allScores = { ...scores, [q.id]: scoreAnswer(q, raw) };
      const total    = Object.values(allScores).reduce((s, r) => s + r.points, 0);
      const maxTotal = questions.reduce((s, qi) => s + qi.scoring.points, 0);
      onComplete({
        answers: questions.map((qi) => ({
          questionId: qi.id,
          raw:        answers[qi.id],
          ...allScores[qi.id],
        })),
        totalScore: total,
        maxScore:   maxTotal,
      });
    } else {
      setQIdx((i) => i + 1);
      setRevealed(false);
    }
  }, [isLast, scores, q, raw, questions, answers, onComplete]);

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

  const totalEarned = Object.values(scores).reduce((s, r) => s + r.points, 0);
  const maxSoFar    = questions.slice(0, qIdx + (revealed ? 1 : 0))
    .reduce((s, qi) => s + qi.scoring.points, 0);

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
        <span className="qz-progress-label">
          {answered} / {questions.length}
        </span>
        {answered > 0 && (
          <span className="qz-score-running" style={{ color }}>
            {totalEarned} pts
          </span>
        )}
      </div>

      {/* question card */}
      <div className="qz-card">
        {/* header */}
        <div className="qz-card-header">
          <span className="qz-q-num" style={{ color }}>Q{qIdx + 1}</span>
          {q.scoring.mustPass && (
            <span className="qz-must-pass">Must Pass</span>
          )}
          <span className="qz-pts">{q.scoring.points} pt{q.scoring.points !== 1 ? 's' : ''}</span>
        </div>

        {/* stem */}
        <p className="qz-stem">{q.stem.en}</p>

        {/* answer widget */}
        {q.payload.kind === 'multiple_choice' && (
          <MultipleChoice
            q={q}
            shuffledOpts={shuffledOpts[qIdx]}
            selected={raw}
            onToggle={toggleOption}
            revealed={revealed}
            scoreResult={scoreResult}
          />
        )}
        {q.payload.kind === 'true_false' && (
          <TrueFalse
            q={q}
            selected={raw}
            onSelect={updateAnswer}
            revealed={revealed}
            scoreResult={scoreResult}
          />
        )}
        {q.payload.kind === 'drag_match' && (
          <DragMatch
            q={q}
            matchState={raw}
            onMatch={updateAnswer}
            revealed={revealed}
            scoreResult={scoreResult}
          />
        )}
        {q.payload.kind === 'fill_blank' && (
          <FillBlank
            q={q}
            value={raw}
            onChange={updateAnswer}
            revealed={revealed}
            scoreResult={scoreResult}
          />
        )}

        {/* feedback */}
        {revealed && (
          <div className={`qz-feedback ${scoreResult?.isCorrect ? 'qz-feedback-correct' : 'qz-feedback-wrong'}`}>
            <div className="qz-feedback-verdict">
              {scoreResult?.isCorrect ? '✓ Correct' : '✗ Incorrect'}
              {q.payload.kind === 'drag_match' && (
                <span style={{ fontWeight: 400, marginLeft: 8 }}>
                  ({scoreResult?.correct}/{scoreResult?.total} matches)
                </span>
              )}
              <span style={{ fontWeight: 400, marginLeft: 8, opacity: .7 }}>
                +{scoreResult?.points} pts
              </span>
            </div>
            <p className="qz-feedback-text">
              {scoreResult?.isCorrect
                ? q.feedback.correct.en
                : q.feedback.incorrect.en}
            </p>
            {q.feedback.reference && (
              <div className="qz-feedback-ref">↗ {q.feedback.reference}</div>
            )}
          </div>
        )}
      </div>

      {/* action buttons */}
      <div className="qz-actions">
        {!revealed ? (
          <button
            className="btn-submit"
            onClick={handleReveal}
            disabled={!hasAnswer()}
          >
            Submit Answer
          </button>
        ) : (
          <button className="btn-submit" onClick={handleNext} style={{ background: color }}>
            {isLast ? 'See Results →' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  );
}
