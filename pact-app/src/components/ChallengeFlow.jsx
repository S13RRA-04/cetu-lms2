import { useState } from 'react';

/*
  ChallengeFlow — squad workshop submission UI.

  Parses the assignment description to extract enumerated deliverables
  (the pattern "answers on X, Y, Z, and W" or bullet-style lists).
  Each deliverable gets its own labeled textarea.
  All responses are combined into a JSON object for submission.
*/

function parseDeliverables(description = '') {
  /* Try to extract items after "answers on …" or "prepare …" */
  const afterOn = description.match(/(?:answers on|prepare (?:squad )?answers on)\s+(.+?)(?:\.|$)/i);
  if (afterOn) {
    const raw   = afterOn[1];
    const parts = raw
      .split(/,\s*|\s+and\s+/i)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter(Boolean);
    if (parts.length >= 2) return parts;
  }

  /* Fallback: look for em-dash or bullet style lines */
  const lines = description.split(/\n/).map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  if (lines.length >= 3) return lines;

  return null; // no structured prompts found — use single textarea
}

export default function ChallengeFlow({ assignment, color, onComplete, submitted, existingContent }) {
  const deliverables = parseDeliverables(assignment.description);

  const [answers,   setAnswers]   = useState(() => {
    if (!existingContent) return {};
    try { return JSON.parse(existingContent)?.responses ?? {}; } catch { return {}; }
  });
  const [freetext,  setFreetext]  = useState(() => {
    if (!existingContent) return '';
    try { const p = JSON.parse(existingContent); return p?.response ?? existingContent; } catch { return existingContent; }
  });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [confirmed, setConfirmed] = useState(false);

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
