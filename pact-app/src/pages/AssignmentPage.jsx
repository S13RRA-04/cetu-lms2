import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAssignment, getMySubmission, submitAssignment, updateProgress } from '../api/pact.js';
import QuizFlow       from '../components/QuizFlow.jsx';
import ChallengeFlow  from '../components/ChallengeFlow.jsx';

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
  const [quizResult,  setQuizResult]  = useState(null);

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
          try {
            const parsed = JSON.parse(sub.content ?? 'null');
            if (parsed?.totalScore !== undefined) setQuizResult(parsed);
          } catch {}
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

  const handleQuizComplete = useCallback(async (result) => {
    setQuizResult(result);
    const json = JSON.stringify(result);
    setContent(json);
    setProgress(100);
    try {
      await submitAssignment(id, json);
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? '';
      setError(msg || 'Submission failed. Please try again.');
    }
  }, [id]);

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

  const color       = TYPE_COLOR[assignment.type] ?? TYPE_COLOR.module;
  const isSquad     = assignment.grading_mode === 'squad';
  const isLocked    = assignment.is_unlocked === false;
  const isSurvey    = assignment.type === 'survey';
  const isChallenge = assignment.type === 'challenge' || assignment.type === 'capstone';
  const hasQuiz     = !isLocked && !isSurvey && !isChallenge && Array.isArray(assignment.questions) && assignment.questions.length > 0;

  return (
    <div className="assignment-page">
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

        {/* ── Locked state ── */}
        {isLocked ? (
          <div className="locked-msg" style={{ padding: '32px 0', fontSize: 14, color: 'var(--muted)' }}>
            🔒 This assignment has not been unlocked for your cohort yet. Check back later or contact your instructor.
          </div>
        ) : /* ── Survey flow ── */
        isSurvey ? (
          submitted ? (
            <div className="success-banner" style={{ marginTop: 24 }}>
              ✓ Survey submitted — thank you for your feedback.
              <br />
              <Link to="/" className="btn-submit" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none', textAlign: 'center', background: color }}>
                ← Back to Dashboard
              </Link>
            </div>
          ) : (
            <>
              {error && <div className="err-msg" style={{ marginBottom: 16 }}>{error}</div>}
              <SurveyFlow
                questions={assignment.questions}
                color={color}
                onComplete={handleQuizComplete}
              />
            </>
          )
        ) : /* ── Challenge / Capstone flow ── */
        isChallenge ? (
          <ChallengeFlow
            assignment={assignment}
            color={color}
            submitted={submitted}
            existingContent={content}
            onComplete={async (payload) => {
              setContent(payload);
              setProgress(100);
              await submitAssignment(id, payload);
              setSubmitted(true);
            }}
          />
        ) : /* ── Quiz flow for module-type assignments with questions ── */
        hasQuiz ? (
          submitted ? (
            <QuizSummary result={quizResult} assignment={assignment} color={color} />
          ) : (
            <>
              {error && <div className="err-msg" style={{ marginBottom: 16 }}>{error}</div>}
              <QuizFlow
                questions={assignment.questions}
                assignmentId={id}
                color={color}
                onComplete={handleQuizComplete}
              />
            </>
          )
        ) : (
          /* ── Freeform submission for non-quiz assignments ── */
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

function SurveyFlow({ questions, color, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [saving,  setSaving]  = useState(false);

  const sections = [...new Set(questions.map((q) => q.section).filter(Boolean))];

  const set = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));

  const requiredIds  = questions.filter((q) => q.type !== 'text').map((q) => q.id);
  const allAnswered  = requiredIds.every((id) => answers[id] !== undefined && answers[id] !== '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onComplete({ surveyResponses: answers, totalScore: 0, maxScore: 0 });
  };

  const renderQuestion = (q, idx) => (
    <div key={q.id} className="survey-question">
      <div className="survey-q-num">Q{idx + 1}</div>
      <div className="survey-q-prompt">{q.prompt}</div>

      {q.type === 'text' ? (
        <textarea
          className="survey-text-input"
          value={answers[q.id] ?? ''}
          onChange={(e) => set(q.id, e.target.value)}
          placeholder="Optional — leave blank to skip"
          rows={3}
        />
      ) : (
        <div className="survey-options">
          {(q.options ?? []).map((opt) => {
            const chosen = answers[q.id] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={`survey-option${chosen ? ' survey-option-selected' : ''}`}
                style={chosen ? { borderColor: color, background: `${color}18`, color } : {}}
                onClick={() => set(q.id, opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <form className="survey-form" onSubmit={handleSubmit}>
      {sections.length > 0
        ? sections.map((section) => (
            <div key={section} className="survey-section">
              <div className="survey-section-label">{section}</div>
              {questions
                .filter((q) => q.section === section)
                .map((q, i) => renderQuestion(q, questions.indexOf(q)))}
            </div>
          ))
        : questions.map((q, i) => renderQuestion(q, i))
      }

      <div className="survey-footer">
        <button
          type="submit"
          className="btn-submit"
          style={{ background: color }}
          disabled={saving || !allAnswered}
        >
          {saving ? 'Submitting…' : 'Submit Survey'}
        </button>
        {!allAnswered && (
          <span className="survey-required-note">
            Please answer all required questions before submitting.
          </span>
        )}
      </div>
    </form>
  );
}

function QuizSummary({ result, assignment, color }) {
  const pct = result
    ? Math.round((result.totalScore / result.maxScore) * 100)
    : null;

  const mustPassFailed = result?.answers?.filter((a) => {
    const q = assignment.questions.find((qi) => qi.id === a.questionId);
    return q?.scoring?.mustPass && !a.isCorrect;
  }) ?? [];

  return (
    <div className="qz-summary">
      <div className="qz-summary-header">
        <div className="qz-summary-icon" style={{ color }}>✓</div>
        <h2>Mission Complete</h2>
        <p>Submission recorded</p>
      </div>

      {result && (
        <>
          <div className="qz-summary-score" style={{ color }}>
            {result.totalScore} / {result.maxScore}
            <span className="qz-summary-pct"> ({pct}%)</span>
          </div>

          {mustPassFailed.length > 0 && (
            <div className="qz-summary-mustfail">
              <strong>Must-Pass items missed ({mustPassFailed.length}):</strong>
              <ul>
                {mustPassFailed.map((a) => {
                  const q = assignment.questions.find((qi) => qi.id === a.questionId);
                  return <li key={a.questionId}>{q?.stem?.en}</li>;
                })}
              </ul>
            </div>
          )}

          <div className="qz-summary-breakdown">
            {result.answers?.map((a, i) => {
              const q = assignment.questions.find((qi) => qi.id === a.questionId);
              return (
                <div key={a.questionId} className={`qz-summary-row ${a.isCorrect ? 'qz-sumrow-ok' : 'qz-sumrow-no'}`}>
                  <span className="qz-sumrow-num">Q{i + 1}</span>
                  <span className="qz-sumrow-stem">{q?.stem?.en}</span>
                  <span className="qz-sumrow-pts">{a.points}/{q?.scoring?.points ?? '?'}</span>
                  {q?.scoring?.mustPass && <span className="qz-must-pass">Must Pass</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Link to="/" className="btn-submit" style={{ display: 'inline-block', marginTop: 24, background: color, textDecoration: 'none', textAlign: 'center' }}>
        ← Back to Dashboard
      </Link>
    </div>
  );
}
