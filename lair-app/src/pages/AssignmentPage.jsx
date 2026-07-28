import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAssignment, getMySubmission, submitAssignment, updateProgress } from '../api/lair.js';
import QuizFlow from '../components/QuizFlow.jsx';
import TerminalGame from '../components/TerminalGame.jsx';
import InvestigationGame from '../components/InvestigationGame.jsx';
import SpeedrunArena from '../components/SpeedrunArena.jsx';
import { LEVELS as CORVID_LEVELS, HOSTNAME as CORVID_HOSTNAME, USER as CORVID_USER } from '../data/terminalGameLevels.js';
import {
  TREE as LAB_TREE, HOSTNAME as LAB_HOSTNAME, USER as LAB_USER,
  CULPRIT as LAB_CULPRIT, CULPRIT_ALIASES as LAB_CULPRIT_ALIASES,
  KEY_EVIDENCE as LAB_KEY_EVIDENCE, HINTS as LAB_HINTS,
} from '../data/investigationCase.js';
import {
  TREE as VK_TREE, HOSTNAME as VK_HOSTNAME, USER as VK_USER,
  CULPRIT as VK_CULPRIT, CULPRIT_ALIASES as VK_CULPRIT_ALIASES,
  KEY_EVIDENCE as VK_KEY_EVIDENCE, HINTS as VK_HINTS,
} from '../data/advancedInvestigationCase.js';

/**
 * Every `type: 'game'` assignment renders an interactive game — keyed by
 * assignment id since content is static/frontend-bundled, not DB-driven
 * (see project memory: no assignment type has a generic admin content
 * editor). `Component` picks which engine renders the pack (TerminalGame's
 * linear level-chain vs. InvestigationGame's free-roam case file), and the
 * rest of the object is spread onto it as props. Add an entry here for any
 * future game.
 */
const GAME_PACKS = {
  'e1a10005-0000-0000-0000-000000000013': {
    Component: TerminalGame,
    levels: CORVID_LEVELS, hostname: CORVID_HOSTNAME, user: CORVID_USER,
  },
  'e1a10007-0000-0000-0000-000000000015': {
    Component: InvestigationGame,
    tree: LAB_TREE, hostname: LAB_HOSTNAME, user: LAB_USER,
    culprit: LAB_CULPRIT, culpritAliases: LAB_CULPRIT_ALIASES,
    keyEvidence: LAB_KEY_EVIDENCE, hints: LAB_HINTS,
  },
  'e1a10008-0000-0000-0000-000000000016': {
    Component: InvestigationGame,
    tree: VK_TREE, hostname: VK_HOSTNAME, user: VK_USER,
    culprit: VK_CULPRIT, culpritAliases: VK_CULPRIT_ALIASES,
    keyEvidence: VK_KEY_EVIDENCE, hints: VK_HINTS,
    commandSet: 'advanced',
  },
};

const TYPE_COLOR = {
  module:     '#f0a428',
  assessment: '#e8b339',
  survey:     '#a78bfa',
  game:       '#33ff5e',
  challenge:  '#39d6ff',
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
  const [quizStarted, setQuizStarted] = useState(false);
  const [gameResult,  setGameResult]  = useState(null);
  const [speedrunResult, setSpeedrunResult] = useState(null);

  useEffect(() => {
    setAssignment(null);
    setSubmission(null);
    setContent('');
    setProgress(0);
    setLoading(true);
    setSubmitted(false);
    setError('');
    setQuizResult(null);
    setQuizStarted(false);
    setGameResult(null);
    setSpeedrunResult(null);

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
            else if (parsed?.levelsCompleted !== undefined) setGameResult(parsed);
            else if (parsed?.tasksSolved !== undefined) setSpeedrunResult(parsed);
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

  const handleGameComplete = useCallback(async (result) => {
    setGameResult(result);
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

  const handleSpeedrunComplete = useCallback(async (result) => {
    setSpeedrunResult(result);
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

  const color      = TYPE_COLOR[assignment.type] ?? TYPE_COLOR.module;
  const isLocked   = assignment.is_unlocked === false;
  const isSurvey   = assignment.type === 'survey';
  const isGame     = !isLocked && assignment.type === 'game';
  const { Component: GameComponent, ...gamePack } = GAME_PACKS[id] ?? GAME_PACKS['e1a10005-0000-0000-0000-000000000013'];
  const isSpeedrun = !isLocked && assignment.type === 'challenge';
  /* hasQuiz: any type with questions uses QuizFlow (modules and assessments with a question bank) */
  const hasQuiz    = !isLocked && !isSurvey && !isGame && !isSpeedrun && Array.isArray(assignment.questions) && assignment.questions.length > 0;

  return (
    <div className="assignment-page">
      <div className="assignment-body">
        <Link to="/course" className="back-link">← Back to Course</Link>

        <div className="assignment-meta">
          <span className="type-badge" style={{ color, borderColor: color }}>
            {(assignment.type ?? 'module').toUpperCase()}
          </span>
        </div>

        <h1 className="assignment-title">{assignment.title}</h1>

        {assignment.description && (
          <div className="briefing-box">{assignment.description}</div>
        )}

        {assignment.due_date && (
          <p className="mission-due">
            Due: {new Date(assignment.due_date).toLocaleString()}
          </p>
        )}

        <hr className="divider" />

        {/* ── Locked state ── */}
        {isLocked ? (
          <div className="locked-msg" style={{ padding: '32px 0', fontSize: 14, color: 'var(--muted)' }}>
            🔒 This section has not been unlocked for your cohort yet. Check back later or contact your instructor.
          </div>
        ) : /* ── Survey flow ── */
        isSurvey ? (
          submitted ? (
            <div className="success-banner" style={{ marginTop: 24 }}>
              ✓ Survey submitted — thank you for your feedback.
              <br />
              <Link to="/course" className="btn-submit" style={{ display: 'inline-block', marginTop: 16, textDecoration: 'none', textAlign: 'center', background: color }}>
                ← Back to Course
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
        ) : /* ── Terminal game ── */
        isGame ? (
          submitted ? (
            <GameSummary result={gameResult} color={color} />
          ) : (
            <>
              {error && <div className="err-msg" style={{ marginBottom: 16 }}>{error}</div>}
              <GameComponent
                key={id}
                assignmentId={id}
                color={color}
                initialState={submission?.quiz_state}
                onComplete={handleGameComplete}
                {...gamePack}
              />
            </>
          )
        ) : /* ── Speed drills ── */
        isSpeedrun ? (
          submitted ? (
            <SpeedrunSummary result={speedrunResult} color={color} />
          ) : (
            <>
              {error && <div className="err-msg" style={{ marginBottom: 16 }}>{error}</div>}
              <SpeedrunArena
                key={id}
                assignmentId={id}
                color={color}
                initialState={submission?.quiz_state}
                onComplete={handleSpeedrunComplete}
              />
            </>
          )
        ) : /* ── Quiz flow (modules and assessments with a question bank) ── */
        hasQuiz ? (
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
              />
            </>
          )
        ) : (
          /* ── Freeform submission for non-quiz assignments ── */
          <>
            <div style={{ marginBottom: 28 }}>
              <div className="section-label">Progress</div>
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
              <div className="success-banner">✓ Response submitted</div>
            ) : (
              <div>
                <div className="section-label">Your Response</div>
                {submission && (
                  <div className="prev-submission">
                    ✓ Previous response on record — resubmitting will replace it
                  </div>
                )}
                {error && <div className="err-msg">{error}</div>}
                <form onSubmit={handleSubmit}>
                  <textarea
                    className="response-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your response…"
                    required
                  />
                  <div className="action-row">
                    <button type="submit" className="btn-submit" disabled={saving}>
                      {saving ? 'Submitting…' : submission ? 'Resubmit' : 'Submit'}
                    </button>
                    <Link to="/course" className="btn-cancel">Cancel</Link>
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
  const typeLabel  = 'Assessment';

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
          ⚠ {mustPass} question{mustPass !== 1 ? 's are' : ' is'} flagged Must-Pass.
          Wrong answers on these items reflect a critical DFIR concept — review carefully before submitting.
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

function GameSummary({ result, color }) {
  // Two completion shapes share this summary: TerminalGame's linear chain
  // ({levelsCompleted, totalLevels}) and InvestigationGame's free-roam case
  // ({accused, wrongAttempts, evidenceViewed, totalKeyEvidence}).
  const isInvestigation = result && result.accused !== undefined;
  return (
    <div className="qz-summary">
      <div className="qz-summary-header">
        <div className="qz-summary-icon" style={{ color }}>✓</div>
        <h2>Case Closed</h2>
        <p>{isInvestigation ? 'Investigation complete' : 'Terminal drill complete'}</p>
      </div>

      {result && (
        <div className="qz-summary-score" style={{ color }}>
          {isInvestigation ? (
            <>
              {result.evidenceViewed?.length ?? 0} / {result.totalKeyEvidence}
              <span className="qz-summary-pct"> evidence found</span>
              {result.wrongAttempts > 0 && (
                <div className="qz-summary-pct" style={{ marginTop: 6 }}>
                  {result.wrongAttempts} accusation{result.wrongAttempts === 1 ? '' : 's'} before the right one
                </div>
              )}
            </>
          ) : (
            <>
              {result.levelsCompleted} / {result.totalLevels}
              <span className="qz-summary-pct"> levels</span>
            </>
          )}
        </div>
      )}

      <Link to="/course" className="btn-submit" style={{ display: 'inline-block', marginTop: 24, background: color, textDecoration: 'none', textAlign: 'center' }}>
        ← Back to Course
      </Link>
    </div>
  );
}

function SpeedrunSummary({ result, color }) {
  const mm = result ? String(Math.floor(result.elapsedSeconds / 60)).padStart(2, '0') : '00';
  const ss = result ? String(result.elapsedSeconds % 60).padStart(2, '0') : '00';
  return (
    <div className="qz-summary">
      <div className="qz-summary-header">
        <div className="qz-summary-icon" style={{ color }}>✓</div>
        <h2>Drill Complete</h2>
        <p>Speed drills submitted</p>
      </div>

      {result && (
        <div className="qz-summary-score" style={{ color }}>
          {result.tasksSolved} / {result.totalTasks}
          <span className="qz-summary-pct"> solved · {mm}:{ss}</span>
        </div>
      )}

      <Link to="/course" className="btn-submit" style={{ display: 'inline-block', marginTop: 24, background: color, textDecoration: 'none', textAlign: 'center' }}>
        ← Back to Course
      </Link>
    </div>
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
        <h2>Assessment Complete</h2>
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
                  return <li key={a.questionId}>{q?.stem}</li>;
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
                  <span className="qz-sumrow-stem">{q?.stem}</span>
                  <span className="qz-sumrow-pts">{a.points}/{q?.scoring?.points ?? '?'}</span>
                  {q?.scoring?.mustPass && <span className="qz-must-pass">Must Pass</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      <Link to="/course" className="btn-submit" style={{ display: 'inline-block', marginTop: 24, background: color, textDecoration: 'none', textAlign: 'center' }}>
        ← Back to Course
      </Link>
    </div>
  );
}
