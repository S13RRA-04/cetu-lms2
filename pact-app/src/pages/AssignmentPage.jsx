import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAssignment, getMySubmission, submitAssignment, updateProgress } from '../api/pact.js';

const TYPE_COLOR = {
  module:     '#2563eb',
  game:       '#059669',
  assessment: '#d97706',
  survey:     '#7c3aed',
  challenge:  '#dc2626',
  capstone:   '#b45309',
};

const PCT_STEPS = [0, 25, 50, 75, 100];

export default function AssignmentPage() {
  const { id } = useParams();

  const [assignment,  setAssignment]  = useState(null);
  const [submission,  setSubmission]  = useState(null);
  const [content,     setContent]     = useState('');
  const [progress,    setProgress]    = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    Promise.all([
      getAssignment(id),
      getMySubmission(id).catch(() => null),
    ]).then(([a, sub]) => {
      setAssignment(a);
      if (sub) {
        setSubmission(sub);
        setContent(sub.content ?? '');
        setProgress(sub.progress ?? 0);
        if (sub.status === 'submitted' || sub.status === 'graded') {
          setSubmitted(true);
        }
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const handleProgressStep = useCallback(async (pct) => {
    setProgress(pct);
    try { await updateProgress(id, pct); } catch {}
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await submitAssignment(id, content);
      setProgress(100);
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? '';
      if (msg.includes('squad')) {
        setError('You must be assigned to a squad to submit this assignment. Contact your instructor.');
      } else if (msg.includes('cohort') || msg.includes('unlock') || err.response?.status === 403) {
        setError('This assignment is not yet unlocked for your cohort.');
      } else {
        setError(msg || 'Submission failed. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  if (!assignment) {
    return (
      <div className="loading-screen">
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.1em' }}>
          Assignment not found.
        </p>
      </div>
    );
  }

  const color    = TYPE_COLOR[assignment.type] ?? TYPE_COLOR.module;
  const isSquad  = assignment.grading_mode === 'squad';

  return (
    <div className="assignment-page">
      <header className="pact-header">
        <span className="header-pact">PACT</span>
      </header>

      <div className="assignment-body">
        <Link to="/" className="back-link">← Back to Dashboard</Link>

        <div className="assignment-meta">
          <span className="type-badge" style={{ color, borderColor: color }}>
            {(assignment.type ?? 'module').toUpperCase()}
          </span>
          {isSquad && <span className="squad-badge">Squad</span>}
        </div>

        <h1 className="assignment-title">{assignment.title}</h1>

        {assignment.description && (
          <div className="briefing-box">{assignment.description}</div>
        )}

        {assignment.due_date && (
          <p className="mission-due">
            Deadline: {new Date(assignment.due_date).toLocaleString()}
          </p>
        )}

        <hr className="divider" />

        {/* ── Progress ── */}
        <div style={{ marginBottom: 28 }}>
          <div className="section-label">Mission Progress</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%`, background: color }} />
          </div>
          <div className="progress-btns">
            {PCT_STEPS.map((pct) => (
              <button
                key={pct}
                className={`pct-btn${progress === pct ? ' active' : ''}`}
                onClick={() => handleProgressStep(pct)}
                disabled={submitted}
              >
                {pct}%
              </button>
            ))}
            <span className="pct-display">{progress}%</span>
          </div>
        </div>

        <hr className="divider" />

        {/* ── Submission ── */}
        {submitted ? (
          <div className="success-banner">
            ✓ Mission submitted successfully
            {submission?.squad && (
              <div style={{ marginTop: 6, fontSize: 11, opacity: .7 }}>
                Squad {submission.squad.number}
                {submission.squad.name ? ` (${submission.squad.name})` : ''}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="section-label">Mission Response</div>

            {isSquad && (
              <div className="squad-notice">
                Squad assignment — your submission will be graded for your entire squad
              </div>
            )}

            {submission && (
              <div className="prev-submission">
                ✓ Previous submission on record — resubmitting will replace it
              </div>
            )}

            {error && <div className="err-msg">{error}</div>}

            <form onSubmit={handleSubmit}>
              <textarea
                className="response-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter your mission response…"
                required
              />
              <div className="action-row">
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Transmitting…' : submission ? 'Resubmit Mission' : 'Submit Mission'}
                </button>
                <Link to="/" className="btn-cancel">Cancel</Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
