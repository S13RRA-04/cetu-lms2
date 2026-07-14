import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getAssignment, getMySubmission, getMyGrades, submitAssignment, updateProgress, getSquadChallengeState } from '../api/pact.js';
import DecryptText      from '../components/DecryptText.jsx';
import SubmitSequence   from '../components/SubmitSequence.jsx';
import SubmissionSuccess from '../components/SubmissionSuccess.jsx';
import { FormattedTextEditor } from '../components/FormattedText.jsx';
import QuizFlow, { MultipleChoice, TrueFalse, DragMatch, FillBlank } from '../components/QuizFlow.jsx';
import ChallengeFlow    from '../components/ChallengeFlow.jsx';
import useDraft         from '../hooks/useDraft.js';
import { TYPE_DEFINITIONS } from './DashboardHome.jsx';
import TransmissionInterceptor from './TransmissionInterceptor.jsx';

const TYPE_COLOR = {
  module:     '#60a5fa',
  game:       '#34d399',
  assessment: '#fbbf24',
  survey:     '#a78bfa',
  challenge:  '#f87171',
  capstone:   '#fb923c',
};

const PCT_STEPS = [0, 25, 50, 75, 100];

/* ── Accessing classified document screen ─────────────────────────────────── */
function AccessingScreen({ assignment }) {
  const color = TYPE_COLOR[assignment?.type] ?? '#60a5fa';
  return (
    <motion.div
      className="ap-access-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.2 }}
    >
      <div className="ap-access-mono">
        <DecryptText text="ACCESSING CLASSIFIED DOCUMENT..." speed={22} hold={3} />
      </div>
      <div className="ap-access-bar">
        <div className="ap-access-bar-fill" style={{ background: color }} />
      </div>
      <div className="ap-access-title">
        {assignment?.title?.toUpperCase() ?? '...'}
      </div>
      {assignment?.drop_number != null && (
        <div className="ap-access-mono" style={{ marginTop: 6 }}>
          DROP {assignment.drop_number}&nbsp;&nbsp;·&nbsp;&nbsp;
          {(assignment.type ?? 'TASKING').toUpperCase()}
        </div>
      )}
    </motion.div>
  );
}

/* ── Main assignment page ─────────────────────────────────────────────────── */
export default function AssignmentPage() {
  const { id } = useParams();

  const [assignment,   setAssignment]   = useState(null);
  const [submission,   setSubmission]   = useState(null);
  const [content,      setContent]      = useState('');
  const [progress,     setProgress]     = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [accessPhase,  setAccessPhase]  = useState('loading'); // loading | accessing | ready
  const [saving,       setSaving]       = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [error,        setError]        = useState('');
  const [quizResult,   setQuizResult]   = useState(null);
  const [quizStarted,  setQuizStarted]  = useState(false);
  const [briefingAcknowledged, setBriefingAcknowledged] = useState(false);
  const [grade,        setGrade]        = useState(null);
  const [progressSaveError, setProgressSaveError] = useState(false);
  const [squadState,   setSquadState]   = useState(null);

  const { saveDebounced, load: loadDraft, clear: clearDraft } = useDraft(id);

  useEffect(() => {
    setAssignment(null);
    setSubmission(null);
    setContent('');
    setProgress(0);
    setLoading(true);
    setAccessPhase('loading');
    setSubmitted(false);
    setError('');
    setQuizResult(null);
    setQuizStarted(false);
    setBriefingAcknowledged(false);
    setGrade(null);
    setSquadState(null);

    Promise.all([
      getAssignment(id),
      getMySubmission(id).catch(() => null),
      getMyGrades().catch(() => []),
    ]).then(async ([a, sub, allGrades]) => {
      const myGrade = (Array.isArray(allGrades) ? allGrades : []).find((g) => g.assignment_id === id);
      if (myGrade) setGrade(myGrade);
      setAssignment(a);
      const alreadySubmitted = sub?.status === 'submitted' || sub?.status === 'graded';
      if (sub) {
        setSubmission(sub);
        setContent(sub.content ?? '');
        setProgress(sub.progress ?? 0);
        if (alreadySubmitted) {
          setSubmitted(true);
          try {
            const parsed = JSON.parse(sub.content ?? 'null');
            if (parsed?.totalScore !== undefined) setQuizResult(parsed);
          } catch {}
        }
      }
      if (!alreadySubmitted) {
        const draft = loadDraft();
        if (draft?.content !== undefined) {
          const serverTs = sub?.updated_at ? new Date(sub.updated_at).getTime() : 0;
          if ((draft._ts ?? 0) > serverTs) {
            setContent(draft.content);
            setProgress(draft.progress ?? sub?.progress ?? 0);
          }
        }

        // Squad-shared challenges resume wherever the squad collectively left
        // off, not just this student's own device — fetched before the
        // loading gate clears so QuizFlow mounts with the real starting point
        // already known (its initial state is only computed once, on mount).
        const isSquadQuiz = a?.grading_mode === 'squad' && Array.isArray(a.questions) && a.questions.length > 0;
        if (isSquadQuiz) {
          try { setSquadState(await getSquadChallengeState(id)); }
          catch { setSquadState(null); }
        }
      }
    }).finally(() => {
      setLoading(false);
      setAccessPhase('accessing');
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drive the access phase timer
  useEffect(() => {
    if (accessPhase === 'accessing') {
      const t = setTimeout(() => setAccessPhase('ready'), 1400);
      return () => clearTimeout(t);
    }
  }, [accessPhase]);

  const handleProgressStep = useCallback(async (pct) => {
    setProgress(pct);
    saveDebounced({ content, progress: pct }, 0);
    try {
      await updateProgress(id, pct);
      setProgressSaveError(false);
    } catch {
      setProgressSaveError(true);
    }
  }, [id, content, saveDebounced]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await submitAssignment(id, content);
      clearDraft();
      setProgress(100);
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? '';
      if (msg.includes('squad') || msg.includes('cell')) {
        setError('You must be assigned to a squad to submit this tasking. Contact your instructor.');
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
    if (saving) return; // guard against a double-click firing this twice before re-render
    setSaving(true);
    setQuizResult(result);
    const json = JSON.stringify(result);
    setContent(json);
    setProgress(100);
    clearDraft();
    try {
      await submitAssignment(id, json);
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message ?? '';
      setError(msg || 'Submission failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [id, clearDraft, saving]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.16em' }}>
          LOADING TASKING...
        </div>
      </div>
    );
  }

  if (accessPhase === 'accessing' && assignment) {
    return (
      <AnimatePresence mode="wait">
        <AccessingScreen key="accessing" assignment={assignment} />
      </AnimatePresence>
    );
  }

  if (!assignment) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.1em' }}>
          TASKING NOT FOUND
        </p>
      </div>
    );
  }

  if (
    assignment.is_unlocked !== false &&
    assignment.launch_briefing &&
    !briefingAcknowledged &&
    !submitted
  ) {
    return (
      <TransmissionInterceptor
        drop={{
          number: assignment.drop_number,
          title: assignment.title,
          narrative_intro: assignment.launch_briefing,
        }}
        idLine={assignment.drop_number != null ? `DROP ${String(assignment.drop_number).padStart(2, '0')}` : 'CHALLENGE BRIEFING'}
        narrativeLabel="COMMAND POST GUIDANCE"
        onAcknowledge={() => setBriefingAcknowledged(true)}
      />
    );
  }

  const color      = TYPE_COLOR[assignment.type] ?? TYPE_COLOR.module;
  const isSquad    = assignment.grading_mode === 'squad';
  const isLocked   = assignment.is_unlocked === false;
  const isSurvey   = assignment.type === 'survey';
  const hasQuiz    = !isLocked && !isSurvey && Array.isArray(assignment.questions) &&
    assignment.questions.some((q) => q.payload != null);
  // Workshop (free-text / prompt deliverables) only when no quiz-style questions present
  const isWorkshop = !isLocked && !hasQuiz &&
    (assignment.type === 'challenge' || assignment.type === 'capstone');

  return (
    <div className="assignment-page">
      <div className="assignment-body">
        <Link to="/" className="back-link">← Operations Center</Link>

        <div className="assignment-meta">
          <span
            className="type-badge"
            style={{ color, borderColor: color }}
            title={TYPE_DEFINITIONS[assignment.type ?? 'module']}
          >
            {(assignment.type ?? 'module').toUpperCase()}
          </span>
          {assignment.drop_number != null && (
            <span className="type-badge" style={{ color: 'var(--muted)', borderColor: 'var(--border)', fontFamily: 'var(--mono)', fontSize: 10 }}>
              DROP {assignment.drop_number}
            </span>
          )}
          {isSquad && <span className="squad-badge">Squad Tasking</span>}
          {assignment.victim_name && (
            <span className="type-badge" style={{ color: '#f87171', borderColor: '#f87171', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700 }}>
              {assignment.victim_name.toUpperCase()}
            </span>
          )}
          {assignment.role_filters?.length > 0 && (
            <span className="squad-badge" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              {assignment.role_filters.join(' · ')}
            </span>
          )}
        </div>

        <h1 className="assignment-title glitch-text" data-text={assignment.title}>
          {assignment.title}
        </h1>

        {assignment.description && (
          <div className="briefing-classified">{assignment.description}</div>
        )}

        {assignment.due_date && (
          <p className="mission-due">
            Deadline: {new Date(assignment.due_date).toLocaleString()}
          </p>
        )}

        <hr className="divider" />

        {isLocked ? (
          <div className="locked-msg" style={{ padding: '32px 0', fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>
            TASKING RESTRICTED — Awaiting Command authorization for your cohort.
          </div>
        ) : isSurvey ? (
          submitted ? (
            <div className="ap-success-root" style={{ paddingTop: 0 }}>
              <div className="ap-success-stamp">RESPONSE LOGGED</div>
              <div className="ap-success-title">SURVEY SUBMITTED</div>
              <div className="ap-success-sub">Your feedback has been recorded. Thank you.</div>
              <Link to="/" className="ap-success-back" style={{ marginTop: 20 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                RETURN TO OPERATIONS CENTER
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
        ) : isWorkshop ? (
          <ChallengeFlow
            assignment={assignment}
            color={color}
            submitted={submitted}
            existingContent={content}
            grade={grade}
            onComplete={async (payload) => {
              if (saving) return; // guard against a double-click firing this twice before re-render
              setSaving(true);
              try {
                setContent(payload);
                setProgress(100);
                await submitAssignment(id, payload);
                setSubmitted(true);
              } finally {
                setSaving(false);
              }
            }}
          />
        ) : hasQuiz ? (
          submitted ? (
            <QuizSummary result={quizResult} assignment={assignment} color={color} />
          ) : assignment.type === 'assessment' && !quizStarted ? (
            <ModuleIntro assignment={assignment} color={color} onBegin={() => setQuizStarted(true)} />
          ) : (
            <>
              {error && <div className="err-msg" style={{ marginBottom: 16 }}>{error}</div>}
              <QuizFlow
                key={id}
                questions={assignment.questions}
                assignmentId={id}
                color={color}
                onComplete={handleQuizComplete}
                submitting={saving}
                squadShared={assignment.grading_mode === 'squad'}
                initialSquadState={squadState}
              />
            </>
          )
        ) : (
          /* ── Freeform submission ── */
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="section-label">OPERATIONAL PROGRESS</div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%`, background: color }} />
              </div>
              <div className="progress-btns">
                {PCT_STEPS.map((pct) => (
                  <button
                    key={pct}
                    className={`pct-btn${progress === pct ? ' active' : ''}`}
                    onClick={() => handleProgressStep(pct)}
                    disabled={submitted || saving}
                  >
                    {pct}%
                  </button>
                ))}
                <span className="pct-display">{progress}%</span>
              </div>
              {progressSaveError && (
                <div className="err-msg" style={{ marginTop: 10, fontSize: 12.5 }}>
                  Progress isn't syncing to the server right now — it's saved on this device and will sync automatically once the connection recovers.
                </div>
              )}
            </div>

            <hr className="divider" />

            {submitted ? (
              <SubmissionSuccess
                assignment={assignment}
                submission={submission}
                color={color}
              />
            ) : saving ? (
              <SubmitSequence color={color} />
            ) : (
              <div>
                <div className="section-label">FIELD REPORT</div>
                {isSquad && (
                  <div className="squad-notice">
                    Squad tasking — your submission will be graded for your entire squad
                  </div>
                )}
                {submission && (
                  <div className="prev-submission">
                    Previous report on record — resubmitting will replace it
                  </div>
                )}
                {error && <div className="err-msg">{error}</div>}
                <form onSubmit={handleSubmit}>
                  <FormattedTextEditor
                    value={content}
                    onChange={(value) => {
                      setContent(value);
                      saveDebounced({ content: value, progress });
                    }}
                    placeholder="Enter your field report response…"
                    rows={10}
                    required
                  />
                  <div className="action-row">
                    <button type="submit" className="btn-submit" style={{ background: color }} disabled={saving}>
                      {submission ? 'RESUBMIT REPORT' : 'SUBMIT FIELD REPORT'}
                    </button>
                    <Link to="/" className="btn-cancel">CANCEL</Link>
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

function ModuleIntro({ assignment, color, onBegin }) {
  const questions  = assignment.questions ?? [];
  const totalPts   = questions.reduce((s, q) => s + (q.scoring?.points ?? 0), 0);
  const mustPass   = questions.filter((q) => q.scoring?.mustPass).length;
  const typeLabel  = assignment.type === 'capstone' ? 'Capstone Assessment' : 'Module Assessment';

  return (
    <div className="module-intro">
      <div className="module-intro-label" style={{ color }}>{typeLabel}</div>

      <div className="module-intro-stats">
        <div className="module-stat">
          <div className="module-stat-val" style={{ color }}>{questions.length}</div>
          <div className="module-stat-key">Questions</div>
        </div>
        <div className="module-stat">
          <div className="module-stat-val" style={{ color }}>{totalPts}</div>
          <div className="module-stat-key">Points</div>
        </div>
        {mustPass > 0 && (
          <div className="module-stat">
            <div className="module-stat-val" style={{ color: '#ef4444' }}>{mustPass}</div>
            <div className="module-stat-key">Must-Pass</div>
          </div>
        )}
      </div>

      {mustPass > 0 && (
        <div className="module-mustpass-warn">
          {mustPass} question{mustPass !== 1 ? 's are' : ' is'} flagged Must-Pass.
          Wrong answers on these items reflect critical operational knowledge — review carefully before submitting.
        </div>
      )}

      <div className="module-intro-rules">
        <div className="module-rule">
          <span className="module-rule-icon">◈</span>
          Questions are answered one at a time. Correct answers earn full points.
        </div>
        <div className="module-rule">
          <span className="module-rule-icon">◈</span>
          Wrong answers reduce available points. Using a hint costs 1 point.
        </div>
        <div className="module-rule">
          <span className="module-rule-icon">◈</span>
          After three strikes, the correct answer is revealed at 0 points.
        </div>
      </div>

      <button
        className="btn-submit module-begin-btn"
        style={{ background: color }}
        onClick={onBegin}
      >
        Begin Assessment →
      </button>
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
                .map((q) => renderQuestion(q, questions.indexOf(q)))}
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

/* Renders a question's full option list, the student's own selection, and the
   correct answer — reusing QuizFlow's own answer widgets in their "locked"
   (revealed/forced) state so the review looks identical to how the question
   resolved during the quiz itself. */
function QuizAnswerReview({ q, raw, isCorrect }) {
  if (!q?.payload) return null;
  const noop = () => {};
  // Every widget treats "revealed" and "forced" identically for the purposes
  // of marking correct/selected options — only FillBlank's input color reads
  // `revealed` specifically, which is exactly what we want here (green if the
  // student's answer was correct, red — with the accepted list shown — if not).
  const revealed = isCorrect;
  const forced   = !isCorrect;

  switch (q.payload.kind) {
    case 'multiple_choice':
      return (
        <MultipleChoice
          q={q}
          shuffledOpts={q.payload.options}
          selected={raw}
          onToggle={noop}
          revealed={revealed}
          forced={forced}
        />
      );
    case 'true_false':
      return <TrueFalse q={q} selected={raw} onSelect={noop} revealed={revealed} forced={forced} />;
    case 'drag_match':
      return (
        <DragMatch
          q={q}
          targets={q.payload.targets}
          matchState={raw}
          onMatch={noop}
          revealed={revealed}
          forced={forced}
        />
      );
    case 'fill_blank':
      return <FillBlank q={q} value={raw} onChange={noop} revealed={revealed} forced={forced} />;
    default:
      return null;
  }
}

function QuizSummary({ result, assignment, color }) {
  const [expanded, setExpanded] = useState(new Set());
  const toggleExpanded = (questionId) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(questionId)) next.delete(questionId);
    else next.add(questionId);
    return next;
  });

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
        <div className="qz-summary-icon" style={{ color }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2>ASSESSMENT COMPLETE</h2>
        <p>Report transmitted to command.</p>
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
                  return <li key={a.questionId}>{q?.stem}</li>;
                })}
              </ul>
            </div>
          )}

          <div className="qz-summary-breakdown">
            {result.answers?.map((a, i) => {
              const q = assignment.questions.find((qi) => qi.id === a.questionId);
              const isOpen = expanded.has(a.questionId);
              return (
                <div key={a.questionId} className={`qz-summary-item ${a.isCorrect ? 'qz-sumrow-ok' : 'qz-sumrow-no'}`}>
                  <button
                    type="button"
                    className="qz-summary-row"
                    onClick={() => toggleExpanded(a.questionId)}
                    aria-expanded={isOpen}
                  >
                    <span className="qz-sumrow-num">Q{i + 1}</span>
                    <span className="qz-sumrow-stem">{q?.stem}</span>
                    <span className="qz-sumrow-pts">{a.points}/{q?.scoring?.points ?? '?'}</span>
                    {q?.scoring?.mustPass && <span className="qz-must-pass">Must Pass</span>}
                    <span className="qz-sumrow-chevron">{isOpen ? '▾' : '▸'}</span>
                  </button>
                  {isOpen && q && (
                    <div className="qz-summary-detail">
                      <QuizAnswerReview q={q} raw={a.raw} isCorrect={a.isCorrect} />
                      {q.feedback?.reference && <div className="qz-feedback-ref">↗ {q.feedback.reference}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {assignment.debrief && (
            <div className="qz-summary-debrief">
              <div className="qz-summary-debrief-label">DEBRIEF</div>
              <p>{assignment.debrief}</p>
            </div>
          )}
        </>
      )}

      <Link to="/" className="btn-submit" style={{ display: 'inline-block', marginTop: 24, background: color, textDecoration: 'none', textAlign: 'center' }}>
        ← Operations Center
      </Link>
    </div>
  );
}
