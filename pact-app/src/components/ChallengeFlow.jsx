import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { loadDraftSync, clearDraftSync, draftKey } from '../hooks/useDraft.js';
import { updateProgress, getSquadChallengeState, saveSquadChallengeState, COURSE_ID } from '../api/pact.js';
import useSquadFieldSync from '../hooks/useSquadFieldSync.js';
import useAuthStore from '../store/authStore.js';
import SubmitSequence from './SubmitSequence.jsx';
import { FormattedText, FormattedTextEditor } from './FormattedText.jsx';
import { MultipleChoice, TrueFalse, FillBlank, DragMatch } from './QuizFlow.jsx';

// A fill_blank answer is a string, so "answered" means non-empty text — an
// input the student typed into then cleared must not count as answered (the
// multiple-choice/true-false answers are only ever undefined or a value).
// A drag_match answer is a {sourceId: targetId} map that grows one entry at
// a time as items are placed — "answered" means every source has been
// placed, not just that the map exists.
// Squads were splitting deliverables up one-question-per-person to go
// faster, which works but skips the actual point of squad work — arguing out
// an answer together. Each deliverable gets its own "squad consensus" field
// that has to be filled in (past a trivial length, so a one-word placeholder
// doesn't count) before that question's real answer box unlocks — a soft
// nudge toward discussing first, not a hard block (a squad can still write a
// token line and split up the real answer; that's a known, accepted gap, not
// a bug). Only applies to genuine squad-graded challenges — an individual
// role-tasking assignment has no one to brainstorm with.
const CONSENSUS_MIN_LENGTH = 15;
const consensusKey = (i) => `consensus-${i}`;

function isCheckAnswered(q, raw) {
  if (q.payload?.kind === 'fill_blank') return typeof raw === 'string' && raw.trim().length > 0;
  if (q.payload?.kind === 'drag_match') return Object.keys(raw ?? {}).length === (q.payload.sources?.length ?? 0);
  return raw !== undefined;
}

// Mirrors the multiple_choice/true_false branches of QuizFlow's isAnswerCorrect
// (not exported from there) — used for the self-check "judgment check"
// questions some challenges embed alongside their free-text prompt(s), e.g.
// Drop 7 role tasking.
function isCheckCorrect(q, raw) {
  const p = q.payload;
  if (p.kind === 'multiple_choice') {
    const correct  = new Set(p.correct);
    const selected = new Set(raw ?? []);
    if (p.selectionMode === 'single') return selected.size === 1 && correct.has([...selected][0]);
    return [...correct].every((id) => selected.has(id)) && [...selected].every((id) => correct.has(id));
  }
  if (p.kind === 'true_false') return raw === p.correct;
  if (p.kind === 'fill_blank') {
    const blank = p.blanks?.[0];
    if (!blank) return false;
    const norm = (s) => (blank.caseSensitive ? String(s).trim() : String(s).trim().toLowerCase());
    return (blank.accepted ?? []).some((a) => norm(a) === norm(raw ?? ''));
  }
  if (p.kind === 'drag_match') {
    const matchMap = Object.fromEntries((p.matches ?? []).map((m) => [m.sourceId, m.targetId]));
    const entries = Object.entries(raw ?? {});
    return entries.length === (p.matches?.length ?? 0) && entries.every(([src, tgt]) => matchMap[src] === tgt);
  }
  return false;
}

/*
  ChallengeFlow — squad workshop submission UI.

  Parses the assignment description to extract enumerated deliverables
  (the pattern "answers on X, Y, Z, and W" or bullet-style lists).
  Each deliverable gets its own labeled textarea.
  All responses are combined into a JSON object for submission.
*/

function splitOnCommasAnd(str) {
  return str
    .split(/,\s*(?:and\s+)?|\s+and\s+/i)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 3);
}

function parseDeliverables(description = '') {
  if (!description) return null;

  const p1 = description.match(/(?:answers on|prepare (?:squad )?answers on)\s+(.+?)(?:\.|$)/i);
  if (p1) {
    const parts = splitOnCommasAnd(p1[1]);
    if (parts.length >= 2) return parts;
  }

  const numbered = [...description.matchAll(/\d+\.\s+([^\n]+)/g)];
  if (numbered.length >= 2) {
    return numbered.map((m) => {
      const text = m[1].replace(/\s*—.*/, '').trim();
      return text.length > 80 ? text.slice(0, 80) + '…' : text;
    });
  }

  const p3 = description.match(/your job is to\s+(.+?)(?:\.|$)/i);
  if (p3) {
    const parts = splitOnCommasAnd(p3[1]);
    if (parts.length >= 2) return parts;
  }

  const p4 = description.match(/\busing\s+(?:the\s+)?(.+?)(?:\blunch\b|\bbefore\b|\.|$)/i);
  if (p4) {
    const parts = splitOnCommasAnd(p4[1]);
    if (parts.length >= 2) return parts;
  }

  const sentences = description.split(/(?<=[.!?])\s+/);
  for (const sent of sentences.reverse()) {
    const clauses = sent.split(/,\s*(?:and\s+)?/i).map((s) => s.trim()).filter((s) => s.length > 5 && /^[A-Za-z]/.test(s));
    if (clauses.length >= 3) return clauses;
  }

  const bullets = description.split(/\n/).map((l) => l.replace(/^[-•*\d.]+\s*/, '').trim()).filter(Boolean);
  if (bullets.length >= 3) return bullets;

  return null;
}

// Lets a squad re-open the case narrative shown on the pre-challenge
// transmission screen without leaving the questions — that screen is a
// one-time animated acknowledgement gate, not something students can flip
// back to once they're working, so this is the only way back to it short of
// re-answering from scratch.
function CaseBriefingPanel({ narrative }) {
  const [open, setOpen] = useState(false);
  if (!narrative) return null;
  return (
    <div className="challenge-briefing-panel">
      <button
        type="button"
        className="challenge-briefing-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="challenge-briefing-toggle-icon">{open ? '▾' : '▸'}</span>
        <span>CASE BRIEFING</span>
        <span className="challenge-briefing-hint">{open ? 'Hide' : 'Reference the case narrative'}</span>
      </button>
      {open && (
        <div className="challenge-briefing-body">
          <FormattedText value={narrative} />
        </div>
      )}
    </div>
  );
}

const IcUsers = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

export default function ChallengeFlow({ assignment, color, onComplete, submitted, existingContent, grade }) {
  const explicitPrompts = (assignment.questions ?? [])
    .filter((q) => q.kind === 'prompt' && q.text)
    .map((q) => q.text);

  const deliverables = explicitPrompts.length > 0
    ? explicitPrompts
    : parseDeliverables(assignment.description);
  const checkQuestions = (assignment.questions ?? []).filter((q) => q.payload != null);
  const saveTimer = useRef(null);
  // Namespaced by user (see useDraft.js) — a cohort-wide assignment (one
  // role's row shared by every squad, e.g. Drop 3/4) has the SAME assignment
  // id for every squad, so on a shared lab machine an un-namespaced draft key
  // let one student's leftover draft silently load into a different
  // student's (different squad, same role) answer box.
  const currentUser = useAuthStore((s) => s.user);

  const draft    = loadDraftSync(assignment.id, currentUser?.id);
  const useDraft = draft && (!existingContent || (draft._ts ?? 0) > 0);

  // Deliverables, squad-consensus notes, AND judgment-check answers (MC/TF/
  // fill-blank/drag-match) all live in this one field-keyed bag, synced to
  // the squad's shared server-side state the same way regardless of which
  // kind of field they are — see updateSharedAnswer below. Judgment checks
  // used to be split into their own local-only `checkAnswers` state that
  // never synced past this one browser's localStorage draft: a squad member
  // could fill in the drag-match exercise and have it vanish the moment
  // anyone else opened the assignment, or even on their own reload from a
  // different device. Folding them in here fixes that for free.
  const [answers,   setAnswers]   = useState(() => {
    if (useDraft && draft.answers) {
      // A pre-fix draft may still have judgment-check answers filed
      // separately under draft.checkAnswers — merge them in once so nobody
      // loses in-progress work from before this change shipped.
      return draft.checkAnswers ? { ...draft.checkAnswers, ...draft.answers } : draft.answers;
    }
    if (!existingContent) return {};
    // responses/consensus/checks were split apart for submission (see
    // handleSubmit below) but live together as one field-keyed object while
    // editing — re-merge so a reopened attempt (see the admin "reopen for
    // another attempt" action) restores all three, instead of them coming
    // back empty and re-locking fields that already have real answers.
    try {
      const parsed = JSON.parse(existingContent);
      const consensusEntries = Object.fromEntries(
        Object.entries(parsed?.consensus ?? {}).map(([i, value]) => [consensusKey(i), value])
      );
      const checkEntries = Object.fromEntries(
        Object.entries(parsed?.checks ?? {}).map(([id, record]) => [id, record?.answer])
      );
      return { ...checkEntries, ...(parsed?.responses ?? {}), ...consensusEntries };
    } catch { return {}; }
  });
  const [freetext,  setFreetext]  = useState(() => {
    if (useDraft && draft.freetext !== undefined) return draft.freetext;
    if (!existingContent) return '';
    try { const p = JSON.parse(existingContent); return p?.response ?? existingContent; } catch { return existingContent; }
  });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [typing, setTyping] = useState({});
  const [fieldMeta, setFieldMeta] = useState({});
  const sharedChallenge = assignment.grading_mode === 'squad';
  const sharedTimers = useRef({});
  // Guards against the poll loop below clobbering in-progress local edits:
  // a field the user currently has focused, or one with a debounced/in-flight
  // save that hasn't resolved yet, must not be overwritten by a poll response
  // that can easily reflect a pre-edit snapshot of that same field.
  const focusedFieldRef = useRef(null);
  const pendingFieldsRef = useRef(new Set());

  // Live view + take-control locking. This is layered on top of the REST
  // save/poll below, not a replacement for it — if the socket is down,
  // fields simply behave as before (editable by anyone, poll-synced).
  const {
    fieldLocks: liveLocks, liveValues, connected: liveConnected, takeoverNotice,
    claimField, releaseField: releaseLiveField, sendInput,
  } = useSquadFieldSync({ courseId: COURSE_ID, assignmentId: assignment.id, enabled: sharedChallenge && !submitted });

  const lockFor = (field) => liveLocks[field];
  const isFieldMine = (field) => {
    const lock = lockFor(field);
    return !lock || lock.user_id === currentUser?.id;
  };

  useEffect(() => {
    if (submitted) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey(assignment.id, currentUser?.id),
          JSON.stringify({ answers, freetext, _ts: Date.now() }),
        );
      } catch {}

      // Sync a coarse progress percentage to the backend — without this, no
      // Submission row exists until the squad finally hits submit, so Command's
      // Live Progress view has nothing to show while a squad is actively
      // working a challenge (only QuizFlow synced this; this component never did).
      const answeredCount = deliverables
        ? deliverables.filter((_, i) => (answers[i] ?? '').trim().length > 0).length
        : (freetext.trim().length > 0 ? 1 : 0);
      const totalCount = deliverables ? deliverables.length : 1;
      const checkedCount = checkQuestions.filter((q) => isCheckAnswered(q, answers[q.id])).length;
      const pct = Math.round(((answeredCount + checkedCount) / (totalCount + checkQuestions.length)) * 100);
      updateProgress(assignment.id, pct)
        .then(() => setSaveError(false))
        .catch(() => setSaveError(true));
    }, 700);
  }, [answers, freetext, assignment.id, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSquad = sharedChallenge;

  useEffect(() => {
    if (!sharedChallenge || submitted) return;
    let cancelled = false;
    const apply = (remote) => {
      const manual = remote?.manual;
      if (!manual || cancelled) return;
      const incoming = manual.answers ?? {};
      const isProtected = (field) => focusedFieldRef.current === field || pendingFieldsRef.current.has(field);

      // Merge rather than replace: keep the local value for any field the
      // user is actively editing (focused or with an unsent/in-flight save),
      // so a poll response can't overwrite mid-keystroke. Everything else
      // (including fields a squadmate just changed) takes the remote value.
      setAnswers((prev) => {
        const merged = { ...incoming };
        for (const key of Object.keys(prev)) {
          if (isProtected(key)) merged[key] = prev[key];
        }
        return merged;
      });
      if (!isProtected('__report__')) setFreetext(incoming.__report__ ?? '');

      setTyping(manual.typing ?? {});
      setFieldMeta(manual.field_meta ?? {});
    };
    // This poll is now just a durability/reconnect safety net — live sync
    // during active editing happens over the WebSocket (useSquadFieldSync)
    // above. Widened from the original 1200ms since it no longer needs to
    // feel real-time on its own.
    getSquadChallengeState(assignment.id).then(apply).catch(() => {});
    const timer = setInterval(() => getSquadChallengeState(assignment.id).then(apply).catch(() => {}), 6000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [assignment.id, sharedChallenge, submitted]);

  const syncField = (field, value, isTyping = true) => {
    clearTimeout(sharedTimers.current[field]);
    pendingFieldsRef.current.add(field);
    sharedTimers.current[field] = setTimeout(() => {
      saveSquadChallengeState(assignment.id, { manual: { answers: { [field]: value }, typing: { [field]: isTyping } } })
        .then((remote) => {
          pendingFieldsRef.current.delete(field);
          const manual = remote?.manual;
          if (!manual) return;
          setTyping(manual.typing ?? {});
          setFieldMeta(manual.field_meta ?? {});
        })
        .catch(() => {
          pendingFieldsRef.current.delete(field);
          setSaveError(true);
        });
    }, isTyping ? 350 : 0);
  };

  const updateSharedAnswer = (field, value) => {
    // '__report__' is the one field that lives outside the shared answers
    // bag (see freetext state above) — everything else, deliverables,
    // consensus notes, and judgment-check answers alike, is keyed into it.
    if (field === '__report__') setFreetext(value);
    else setAnswers((previous) => ({ ...previous, [field]: value }));
    if (sharedChallenge) {
      syncField(field, value, true);
      sendInput(field, value);
    }
  };

  const focusField = (field) => {
    focusedFieldRef.current = field;
    if (sharedChallenge) claimField(field);
  };
  const blurField = (field) => {
    if (focusedFieldRef.current === field) focusedFieldRef.current = null;
    if (sharedChallenge) releaseLiveField(field);
  };

  const stopTyping = (field, value) => {
    if (sharedChallenge) syncField(field, value, false);
  };

  const typingLabel = (field) => {
    const presence = typing[field];
    return presence?.name ? `${presence.name} is typing…` : null;
  };

  const collaborators = [...new Map(Object.values(typing)
    .filter((presence) => presence?.name)
    .map((presence) => [presence.user_id, presence])).values()];

  const editLabel = (field) => {
    const meta = fieldMeta[field];
    if (!meta?.updated_at) return null;
    return `Last edited by ${meta.name} · ${new Date(meta.updated_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };

  const lockBanner = (field) => {
    if (!sharedChallenge) return null;
    const lock = lockFor(field);
    if (!lock || isFieldMine(field)) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 11, color: '#f59e0b' }}>
        <span>{lock.name} is editing — locked for you{liveConnected ? '' : ' (reconnecting…)'}</span>
        <button
          type="button"
          onClick={() => claimField(field)}
          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid #f59e0b', background: 'transparent', color: '#f59e0b', cursor: 'pointer' }}
        >
          TAKE CONTROL
        </button>
      </div>
    );
  };

  const deliverableConsensusReady = (i) => !isSquad || (answers[consensusKey(i)] ?? '').trim().length >= CONSENSUS_MIN_LENGTH;

  const canSubmit = (deliverables
    ? deliverables.every((_, i) => deliverableConsensusReady(i) && (answers[i] ?? '').trim().length > 0)
    : freetext.trim().length > 0)
    && checkQuestions.every((q) => isCheckAnswered(q, answers[q.id]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const checks = Object.fromEntries(checkQuestions.map((q) => [
        q.id, { answer: answers[q.id], correct: isCheckCorrect(q, answers[q.id]), points: q.scoring?.points ?? 0 },
      ]));
      const responses = deliverables ? Object.fromEntries(deliverables.map((_, i) => [i, answers[i] ?? ''])) : null;
      const consensus = deliverables && isSquad
        ? Object.fromEntries(deliverables.map((_, i) => [i, answers[consensusKey(i)] ?? '']))
        : null;
      const payload = deliverables
        ? JSON.stringify({ responses, ...(consensus ? { consensus } : {}), deliverables, checks })
        : JSON.stringify({ response: freetext, checks });
      clearDraftSync(assignment.id, currentUser?.id);
      await onComplete(payload);
    } catch (err) {
      setError(err?.message ?? 'Submission failed');
      setSaving(false);
    }
  };

  if (submitted) {
    return (
      <ChallengeReview
        assignment={assignment}
        color={color}
        existingContent={existingContent}
        grade={grade}
      />
    );
  }

  if (saving) {
    return <SubmitSequence color={color} />;
  }

  return (
    <div className="challenge-flow">
      <CaseBriefingPanel narrative={assignment.launch_briefing} />
      {isSquad && (
        <div className="challenge-squad-notice" style={{ borderColor: color, color }}>
          <span className="challenge-squad-icon"><IcUsers /></span>
          SQUAD ASSIGNMENT — response will be graded for your entire squad
        </div>
      )}
      {sharedChallenge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, minHeight: 22 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)' }}>ACTIVE COLLABORATORS</span>
          {collaborators.length ? collaborators.map((presence) => (
            <span key={presence.user_id} style={{ padding: '3px 7px', borderRadius: 999, background: 'rgba(0,176,255,.12)', color: 'var(--primary)', fontSize: 11 }}>{presence.name}</span>
          )) : <span style={{ fontSize: 11, color: 'var(--muted)' }}>No one typing</span>}
        </div>
      )}
      {saveError && (
        <div className="qz-save-warning">
          Progress isn't syncing to the server right now — your answers are safe on this device and will sync automatically once the connection recovers.
        </div>
      )}
      {takeoverNotice && (
        <div className="qz-save-warning" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
          {takeoverNotice.by?.name ?? 'A teammate'} took control of a field you were editing — it's now read-only for you until they finish.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {checkQuestions.length > 0 && (
          <div className="challenge-prompts" style={{ marginBottom: 24 }}>
            <div className="challenge-prompts-header">
              <span className="section-label">JUDGMENT CHECKS</span>
              <span className="challenge-prompts-count">{checkQuestions.length} ITEMS</span>
            </div>
            <p className="challenge-instructions">Quick check questions — pick an answer for each before moving on to the squad deliverables below.</p>
            {checkQuestions.map((q, i) => {
              const raw = answers[q.id];
              const answered = isCheckAnswered(q, raw);
              const setAnswer = (value) => updateSharedAnswer(q.id, value);
              return (
                <motion.div
                  key={q.id}
                  className="challenge-question-card"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.06 }}
                >
                  <div className="challenge-question-header">
                    <span className="challenge-prompt-num">{String(i + 1).padStart(2, '0')} / {String(checkQuestions.length).padStart(2, '0')}</span>
                  </div>
                  <div className="challenge-question-body">
                    <FormattedText value={q.stem} />
                  </div>
                  <div className="challenge-answer-wrap">
                    {q.payload.kind === 'multiple_choice' && (
                      <MultipleChoice
                        q={q}
                        shuffledOpts={q.payload.options}
                        selected={raw}
                        onToggle={(optId) => setAnswer(q.payload.selectionMode === 'single' ? [optId] : (
                          (raw ?? []).includes(optId) ? raw.filter((id) => id !== optId) : [...(raw ?? []), optId]
                        ))}
                        revealed={false}
                        forced={false}
                      />
                    )}
                    {q.payload.kind === 'true_false' && (
                      <TrueFalse q={q} selected={raw} onSelect={setAnswer} revealed={false} forced={false} />
                    )}
                    {q.payload.kind === 'fill_blank' && (
                      <FillBlank q={q} value={raw} onChange={setAnswer} revealed={false} forced={false} />
                    )}
                    {q.payload.kind === 'drag_match' && (
                      <DragMatch q={q} matchState={raw} onMatch={setAnswer} revealed={false} forced={false} />
                    )}
                    {!answered && (
                      <div style={{ marginTop: 4, fontSize: 10, color: 'var(--muted)' }}>
                        {q.payload.kind === 'fill_blank' ? 'Type your answer to continue.'
                          : q.payload.kind === 'drag_match' ? 'Match every item to continue.'
                          : 'Select an answer to continue.'}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {deliverables ? (
          <div className="challenge-prompts">
            <div className="challenge-prompts-header">
              <span className="section-label">SQUAD DELIVERABLES</span>
              <span className="challenge-prompts-count">{deliverables.length} ITEMS</span>
            </div>
            <p className="challenge-instructions">
              Work through each question below as a squad — talk it out before anyone writes. Answers save automatically as you type; nothing is submitted until you review and transmit at the end.
            </p>
            {deliverables.map((prompt, i) => (
              <motion.div
                key={i}
                className="challenge-question-card"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.06 }}
              >
                <div className="challenge-question-header">
                  <span className="challenge-prompt-num">QUESTION {String(i + 1).padStart(2, '0')} / {String(deliverables.length).padStart(2, '0')}</span>
                </div>
                <div className="challenge-question-body">
                  <FormattedText value={prompt} />
                </div>
                {isSquad && (() => {
                  const cKey = consensusKey(i);
                  const ready = deliverableConsensusReady(i);
                  return (
                    <div className="challenge-consensus-wrap">
                      <div className="challenge-consensus-label">Squad consensus — agree on this together first</div>
                      <textarea
                        className="challenge-consensus-input"
                        value={isFieldMine(cKey) ? (answers[cKey] ?? '') : (liveValues[cKey] ?? answers[cKey] ?? '')}
                        onChange={(e) => updateSharedAnswer(cKey, e.target.value)}
                        onFocus={() => { focusField(cKey); syncField(cKey, answers[cKey] ?? '', true); }}
                        onBlur={() => { blurField(cKey); stopTyping(cKey, answers[cKey] ?? ''); }}
                        placeholder="A sentence or two: what does your squad agree on here, before anyone drafts the answer?"
                        rows={2}
                        readOnly={!isFieldMine(cKey)}
                      />
                      {lockBanner(cKey)}
                      {typingLabel(cKey) && <div style={{ marginTop: 5, fontSize: 11, color: 'var(--primary)' }}>{typingLabel(cKey)}</div>}
                      {!ready && <div className="challenge-consensus-hint">Write your squad's shared take above to unlock the answer box below.</div>}
                    </div>
                  );
                })()}
                <div className="challenge-answer-wrap">
                  <div className="challenge-answer-label">Your squad's answer</div>
                  <FormattedTextEditor
                    value={isFieldMine(String(i)) ? (answers[i] ?? '') : (liveValues[String(i)] ?? answers[i] ?? '')}
                    onChange={(value) => updateSharedAnswer(String(i), value)}
                    onFocus={() => { focusField(String(i)); sharedChallenge && syncField(String(i), answers[i] ?? '', true); }}
                    onBlur={() => { blurField(String(i)); stopTyping(String(i), answers[i] ?? ''); }}
                    placeholder={deliverableConsensusReady(i) ? "Type your squad's answer here…" : 'Write your squad\'s consensus above first…'}
                    rows={5}
                    required
                    readOnly={(sharedChallenge && !isFieldMine(String(i))) || !deliverableConsensusReady(i)}
                  />
                  {lockBanner(String(i))}
                  {sharedChallenge && typingLabel(String(i)) && <div style={{ marginTop: 5, fontSize: 11, color: 'var(--primary)' }}>{typingLabel(String(i))}</div>}
                  {sharedChallenge && editLabel(String(i)) && <div style={{ marginTop: 4, fontSize: 10, color: 'var(--muted)' }}>{editLabel(String(i))}</div>}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="challenge-question-card">
            <div className="challenge-question-header">
              <span className="challenge-prompt-num">SQUAD FIELD REPORT</span>
            </div>
            <div className="challenge-answer-wrap">
              <div className="challenge-answer-label">Your squad's report</div>
              <FormattedTextEditor
                value={isFieldMine('__report__') ? freetext : (liveValues.__report__ ?? freetext)}
                onChange={(value) => updateSharedAnswer('__report__', value)}
                onFocus={() => { focusField('__report__'); sharedChallenge && syncField('__report__', freetext, true); }}
                onBlur={() => { blurField('__report__'); stopTyping('__report__', freetext); }}
                placeholder="Enter your squad's field report…"
                rows={8}
                required
                readOnly={sharedChallenge && !isFieldMine('__report__')}
              />
              {lockBanner('__report__')}
              {sharedChallenge && typingLabel('__report__') && <div style={{ marginTop: 5, fontSize: 11, color: 'var(--primary)' }}>{typingLabel('__report__')}</div>}
              {sharedChallenge && editLabel('__report__') && <div style={{ marginTop: 4, fontSize: 10, color: 'var(--muted)' }}>{editLabel('__report__')}</div>}
            </div>
          </div>
        )}

        {error && <div className="err-msg" style={{ marginTop: 12 }}>{error}</div>}

        <div className="challenge-actions">
          {!confirmed ? (
            <button
              type="button"
              className="btn-submit"
              style={{ background: color }}
              disabled={!canSubmit}
              onClick={() => setConfirmed(true)}
            >
              REVIEW SUBMISSION
            </button>
          ) : (
            <div className="challenge-confirm-row">
              <span className="challenge-confirm-msg">TRANSMIT FOR ENTIRE SQUAD?</span>
              <button type="submit" className="btn-submit" style={{ background: color }} disabled={saving}>
                CONFIRM &amp; TRANSMIT
              </button>
              <button type="button" className="btn-cancel" onClick={() => setConfirmed(false)}>CANCEL</button>
            </div>
          )}
          {!canSubmit && (
            <span className="challenge-incomplete-note">ALL FIELDS REQUIRED BEFORE TRANSMITTING.</span>
          )}
        </div>
      </form>
    </div>
  );
}

function ChallengeReview({ assignment, color, existingContent, grade }) {
  let parsed = null;
  try { parsed = JSON.parse(existingContent ?? 'null'); } catch {}

  const prompts      = (assignment.questions ?? []).filter((q) => q.kind === 'prompt');
  const maxScore     = parseFloat(assignment.max_score ?? 100);
  const perPromptMax = prompts.length > 0 ? Math.round(maxScore / prompts.length) : maxScore;

  // Use explicit prompts if available, else fall back to deliverables embedded in submission
  const labels = prompts.length > 0
    ? prompts.map((q) => q.text)
    : (parsed?.deliverables ?? []);

  const responses     = parsed?.responses ?? {};
  const consensus     = parsed?.consensus ?? null;
  const isGraded      = grade != null;
  const promptScores  = grade?.prompt_scores ?? {};
  const pct           = isGraded ? Math.round((grade.score / (grade.max_score ?? 100)) * 100) : null;
  const totalColor    = pct === null ? 'var(--muted)' : pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <CaseBriefingPanel narrative={assignment.launch_briefing} />

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 6, border: `1px solid ${isGraded ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.25)'}`, background: isGraded ? 'rgba(16,185,129,.06)' : 'rgba(245,158,11,.05)', marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: isGraded ? '#10b981' : '#f59e0b' }}>
          {isGraded ? '◉ AFTER-ACTION ASSESSMENT' : '◌ AWAITING ASSESSMENT'}
        </span>
        {isGraded && (
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: totalColor }}>
            {grade.score} / {grade.max_score ?? 100}
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>({pct}%)</span>
          </span>
        )}
        {!isGraded && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>
            Feedback will appear here once reviewed by Command.
          </span>
        )}
      </div>

      {/* Per-prompt review */}
      {labels.map((label, i) => {
        const response = responses[i] ?? '';
        const pts      = prompts[i]?.points ?? perPromptMax;
        const ps       = promptScores[i];
        const psValue  = typeof ps === 'object' ? ps.score : ps;
        const psPct    = psValue !== undefined && pts > 0 ? psValue / pts : null;
        const psColor  = psPct === null ? 'var(--muted)' : psPct >= 0.8 ? '#10b981' : psPct >= 0.5 ? '#f59e0b' : '#ef4444';
        // keyElements only ever reaches this component once the backend has
        // confirmed a grade exists for this student (see assignment.service.js's
        // sanitizeQuestionsForStudent) — the model-answer notes instructors see
        // while grading (rubric.commonErrors) never reach a student's browser
        // at all, graded or not.
        const keyElements = prompts[i]?.rubric?.keyElements ?? [];
        const criteria     = typeof ps === 'object' ? ps.criteria : null;

        return (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--surface-2, var(--surface))' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color, letterSpacing: '.14em', paddingTop: 2, flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')} / {String(labels.length).padStart(2, '0')}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--bright)', lineHeight: 1.5 }}>{label}</span>
              {ps !== undefined && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: psColor, flexShrink: 0 }}>
                  {psValue} / {pts}
                </span>
              )}
            </div>
            {consensus?.[i] && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)', marginBottom: 6 }}>SQUAD CONSENSUS</div>
                <FormattedText value={consensus[i]} />
              </div>
            )}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)', marginBottom: 6 }}>YOUR RESPONSE</div>
              <FormattedText value={response} />
            </div>
            {keyElements.length > 0 && (
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'rgba(16,185,129,.04)' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: '#10b981', marginBottom: 8 }}>GRADED AGAINST</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {keyElements.map((el, j) => {
                    // A rubric graded with the checkbox tool tells us exactly
                    // which elements were credited; one graded with a plain
                    // score doesn't — show the checklist either way, just
                    // without a per-item mark when that detail isn't available.
                    const credited = Array.isArray(criteria) ? Boolean(criteria[j]) : null;
                    return (
                      <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.5 }}>
                        <span style={{ flexShrink: 0, width: 14, textAlign: 'center', color: credited === null ? 'var(--muted)' : credited ? '#10b981' : '#ef4444' }}>
                          {credited === null ? '•' : credited ? '✓' : '✗'}
                        </span>
                        <span style={{ color: credited === false ? 'var(--muted)' : 'var(--text)' }}>{el}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Judgment-check review (multiple_choice/true_false questions embedded alongside the prompt) */}
      {(() => {
        const checkQuestions = (assignment.questions ?? []).filter((q) => q.payload != null);
        if (checkQuestions.length === 0) return null;
        const checks = parsed?.checks ?? {};
        return (
          <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: 'var(--surface-2, var(--surface))' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)' }}>JUDGMENT CHECKS</span>
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {checkQuestions.map((q, i) => {
                const record = checks[q.id];
                const raw = record?.answer;
                const correct = !!record?.correct;
                return (
                  <div key={q.id}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bright)', marginBottom: 6 }}>
                      {String(i + 1).padStart(2, '0')}. {q.stem}
                    </div>
                    {q.payload.kind === 'multiple_choice' && (
                      <MultipleChoice q={q} shuffledOpts={q.payload.options} selected={raw} onToggle={() => {}} revealed={correct} forced={!correct} />
                    )}
                    {q.payload.kind === 'true_false' && (
                      <TrueFalse q={q} selected={raw} onSelect={() => {}} revealed={correct} forced={!correct} />
                    )}
                    {q.payload.kind === 'fill_blank' && (
                      <FillBlank q={q} value={raw} onChange={() => {}} revealed={correct} forced={!correct} />
                    )}
                    {q.payload.kind === 'drag_match' && (
                      <DragMatch q={q} matchState={raw} onMatch={() => {}} revealed={correct} forced={!correct} />
                    )}
                    <div style={{ marginTop: 5, fontSize: 12, color: correct ? '#10b981' : '#ef4444' }}>
                      {correct ? (q.feedback?.correct ?? 'Correct.') : (q.feedback?.incorrect ?? 'Incorrect.')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Freetext fallback (non-deliverable submission) */}
      {labels.length === 0 && parsed?.response && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', background: 'var(--surface-2, var(--surface))' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)' }}>SUBMITTED REPORT</span>
          </div>
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <FormattedText value={parsed.response} />
          </div>
        </div>
      )}

      {/* Instructor feedback */}
      {isGraded && grade.feedback && (
        <div style={{ border: '1px solid rgba(0,176,255,.2)', borderRadius: 6, padding: '14px 16px', background: 'rgba(0,176,255,.04)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--primary)', marginBottom: 8 }}>COMMAND FEEDBACK</div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>{grade.feedback}</p>
        </div>
      )}

      <Link to="/" style={{ display: 'inline-block', marginTop: 4, padding: '8px 18px', borderRadius: 4, background: color, color: '#000', textDecoration: 'none', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', fontWeight: 700, textAlign: 'center', alignSelf: 'flex-start' }}>
        ← OPERATIONS CENTER
      </Link>
    </div>
  );
}
