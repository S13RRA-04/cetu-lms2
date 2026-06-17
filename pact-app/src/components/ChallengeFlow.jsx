import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { loadDraftSync, clearDraftSync } from '../hooks/useDraft.js';
import SubmitSequence   from './SubmitSequence.jsx';
import SubmissionSuccess from './SubmissionSuccess.jsx';

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

export default function ChallengeFlow({ assignment, color, onComplete, submitted, existingContent }) {
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

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          `pact_draft_${assignment.id}`,
          JSON.stringify({ answers, freetext, _ts: Date.now() }),
        );
      } catch {}
    }, 700);
  }, [answers, freetext, assignment.id]);

  const isSquad = assignment.grading_mode === 'squad';

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
      <SubmissionSuccess
        assignment={assignment}
        color={color}
        label="SQUAD REPORT TRANSMITTED"
        subtext="Command has received your squad's field report. Stand by for after-action assessment."
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
                <textarea
                  className="challenge-textarea"
                  value={answers[i] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                  placeholder={`Squad response for: ${prompt}…`}
                  rows={3}
                  required
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="challenge-freeform">
            <div className="section-label" style={{ marginBottom: 10 }}>SQUAD FIELD REPORT</div>
            <textarea
              className="challenge-textarea challenge-textarea-lg"
              value={freetext}
              onChange={(e) => setFreetext(e.target.value)}
              placeholder="Enter your squad's field report…"
              rows={8}
              required
            />
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
