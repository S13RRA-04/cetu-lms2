import { useState, useEffect, useRef } from 'react';
import { loadDraftSync, clearDraftSync } from '../hooks/useDraft.js';

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

  /* 1. "answers on X, Y, Z" or "prepare squad answers on X, Y, Z" */
  const p1 = description.match(/(?:answers on|prepare (?:squad )?answers on)\s+(.+?)(?:\.|$)/i);
  if (p1) {
    const parts = splitOnCommasAnd(p1[1]);
    if (parts.length >= 2) return parts;
  }

  /* 2. Numbered list  "1. X — …\n2. Y — …\n3. Z — …" */
  const numbered = [...description.matchAll(/\d+\.\s+([^\n]+)/g)];
  if (numbered.length >= 2) {
    return numbered.map((m) => {
      const text = m[1].replace(/\s*—.*/, '').trim(); // strip em-dash clause
      return text.length > 80 ? text.slice(0, 80) + '…' : text;
    });
  }

  /* 3. "Your job is to X, Y, Z, and W" */
  const p3 = description.match(/your job is to\s+(.+?)(?:\.|$)/i);
  if (p3) {
    const parts = splitOnCommasAnd(p3[1]);
    if (parts.length >= 2) return parts;
  }

  /* 4. "using the X, Y, and Z" (synthesis worksheets) */
  const p4 = description.match(/\busing\s+(?:the\s+)?(.+?)(?:\blunch\b|\bbefore\b|\.|$)/i);
  if (p4) {
    const parts = splitOnCommasAnd(p4[1]);
    if (parts.length >= 2) return parts;
  }

  /* 5. Verb-clause list — find the sentence with the most comma-separated
        clauses each starting with a letter (covers "Build X, use Y, correlate Z, and state W").
        Only split on commas (not bare "and") to avoid splitting phrases like "physical and digital". */
  const sentences = description.split(/(?<=[.!?])\s+/);
  for (const sent of sentences.reverse()) {
    const clauses = sent.split(/,\s*(?:and\s+)?/i).map((s) => s.trim()).filter((s) => s.length > 5 && /^[A-Za-z]/.test(s));
    if (clauses.length >= 3) return clauses;
  }

  /* 6. Bullet / dash style lines */
  const bullets = description.split(/\n/).map((l) => l.replace(/^[-•*\d.]+\s*/, '').trim()).filter(Boolean);
  if (bullets.length >= 3) return bullets;

  return null;
}

export default function ChallengeFlow({ assignment, color, onComplete, submitted, existingContent }) {
  const deliverables = parseDeliverables(assignment.description);
  const saveTimer    = useRef(null);

  /* Prefer a newer local draft over existingContent from the server */
  const draft = loadDraftSync(assignment.id);
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

  /* Auto-save draft on every change */
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
      <div className="challenge-success">
        <div className="challenge-success-icon" style={{ color }}>✓</div>
        <div className="challenge-success-title">Challenge Submitted</div>
        <div className="challenge-success-sub">Your squad response has been recorded and is pending instructor review.</div>
      </div>
    );
  }

  return (
    <div className="challenge-flow">
      {/* Squad badge */}
      {isSquad && (
        <div className="challenge-squad-notice" style={{ borderColor: color, color }}>
          <span className="challenge-squad-icon">◈</span>
          Squad Assignment — your response will be graded for your entire squad
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {deliverables ? (
          /* Structured: one textarea per deliverable */
          <div className="challenge-prompts">
            <div className="challenge-prompts-header">
              <span className="section-label">Deliverables</span>
              <span className="challenge-prompts-count">{deliverables.length} items</span>
            </div>
            {deliverables.map((prompt, i) => (
              <div key={i} className="challenge-prompt-item">
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
              </div>
            ))}
          </div>
        ) : (
          /* Freeform: single response area */
          <div className="challenge-freeform">
            <div className="section-label" style={{ marginBottom: 10 }}>Squad Response</div>
            <textarea
              className="challenge-textarea challenge-textarea-lg"
              value={freetext}
              onChange={(e) => setFreetext(e.target.value)}
              placeholder="Enter your squad's response…"
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
              Review &amp; Submit
            </button>
          ) : (
            <div className="challenge-confirm-row">
              <span className="challenge-confirm-msg">Submit for your squad?</span>
              <button type="submit" className="btn-submit" style={{ background: color }} disabled={saving}>
                {saving ? 'Transmitting…' : 'Confirm Submit'}
              </button>
              <button type="button" className="btn-cancel" onClick={() => setConfirmed(false)}>Cancel</button>
            </div>
          )}
          {!canSubmit && (
            <span className="challenge-incomplete-note">All fields required before submitting.</span>
          )}
        </div>
      </form>
    </div>
  );
}
