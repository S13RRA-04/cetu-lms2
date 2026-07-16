import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { loadDraftSync, clearDraftSync } from '../hooks/useDraft.js';
import { updateProgress, getSquadChallengeState, saveSquadChallengeState, COURSE_ID } from '../api/pact.js';
import useSquadFieldSync from '../hooks/useSquadFieldSync.js';
import useAuthStore from '../store/authStore.js';
import SubmitSequence from './SubmitSequence.jsx';
import { FormattedText, FormattedTextEditor } from './FormattedText.jsx';

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
  const saveTimer = useRef(null);

  const draft    = loadDraftSync(assignment.id);
  const useDraft = draft && (!existingContent || (draft._ts ?? 0) > 0);

  const [answers,   setAnswers]   = useState(() => {
    if (useDraft && draft.answers) return draft.answers;
    if (!existingContent) return {};
    try { return JSON.parse(existingContent)?.responses ?? {}; } catch { return {}; }
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
  const sharedChallenge = assignment.grading_mode === 'squad' || (assignment.role_filters?.length ?? 0) > 0;
  const sharedTimers = useRef({});
  // Guards against the poll loop below clobbering in-progress local edits:
  // a field the user currently has focused, or one with a debounced/in-flight
  // save that hasn't resolved yet, must not be overwritten by a poll response
  // that can easily reflect a pre-edit snapshot of that same field.
  const focusedFieldRef = useRef(null);
  const pendingFieldsRef = useRef(new Set());
  const currentUser = useAuthStore((s) => s.user);

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
          `pact_draft_${assignment.id}`,
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
      const pct = Math.round((answeredCount / totalCount) * 100);
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
    if (deliverables) setAnswers((previous) => ({ ...previous, [field]: value }));
    else setFreetext(value);
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

  const canSubmit = deliverables
    ? deliverables.every((_, i) => (answers[i] ?? '').trim().length > 0)
    : freetext.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const payload = deliverables
        ? JSON.stringify({ responses: answers, deliverables })
        : JSON.stringify({ response: freetext });
      clearDraftSync(assignment.id);
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
        {deliverables ? (
          <div className="challenge-prompts">
            <div className="challenge-prompts-header">
              <span className="section-label">SQUAD DELIVERABLES</span>
              <span className="challenge-prompts-count">{deliverables.length} ITEMS</span>
            </div>
            {deliverables.map((prompt, i) => (
              <motion.div
                key={i}
                className="challenge-prompt-item"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.06 }}
              >
                <label className="challenge-prompt-label">
                  <span className="challenge-prompt-num">{String(i + 1).padStart(2, '0')}</span>
                  {prompt}
                </label>
                <FormattedTextEditor
                  value={isFieldMine(String(i)) ? (answers[i] ?? '') : (liveValues[String(i)] ?? answers[i] ?? '')}
                  onChange={(value) => updateSharedAnswer(String(i), value)}
                  onFocus={() => { focusField(String(i)); sharedChallenge && syncField(String(i), answers[i] ?? '', true); }}
                  onBlur={() => { blurField(String(i)); stopTyping(String(i), answers[i] ?? ''); }}
                  placeholder={`Squad response for: ${prompt}…`}
                  rows={5}
                  required
                  readOnly={sharedChallenge && !isFieldMine(String(i))}
                />
                {lockBanner(String(i))}
                {sharedChallenge && typingLabel(String(i)) && <div style={{ marginTop: 5, fontSize: 11, color: 'var(--primary)' }}>{typingLabel(String(i))}</div>}
                {sharedChallenge && editLabel(String(i)) && <div style={{ marginTop: 4, fontSize: 10, color: 'var(--muted)' }}>{editLabel(String(i))}</div>}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="challenge-freeform">
            <div className="section-label" style={{ marginBottom: 10 }}>SQUAD FIELD REPORT</div>
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
  const isGraded      = grade != null;
  const promptScores  = grade?.prompt_scores ?? {};
  const pct           = isGraded ? Math.round((grade.score / (grade.max_score ?? 100)) * 100) : null;
  const totalColor    = pct === null ? 'var(--muted)' : pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

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
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)', marginBottom: 6 }}>YOUR RESPONSE</div>
              <FormattedText value={response} />
            </div>
          </div>
        );
      })}

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
