import { useEffect, useState, useCallback } from 'react';
import {
  getAdminAssignments,
  getSubmissions,
  getGradesForAssignment,
  submitGrade,
  updateAssignment,
  getSurveyResults,
  getCohorts,
  unlockAssignment,
  lockAssignment,
  getAdminCourseContent,
  createContentLink,
  uploadContentFile,
  updateContentItem,
  deleteContentItem,
  unlockContentItem,
  lockContentItem,
} from '../api/lair.js';

const TYPE_COLOR = {
  module:     '#f0a428',
  assessment: '#e8b339',
  survey:     '#a78bfa',
};

/* ── helpers ── */
function parseContent(content) {
  try {
    const p = JSON.parse(content ?? 'null');
    if (p?.answers) return { type: 'quiz', data: p };
  } catch {}
  return { type: 'text', data: content };
}

/* ── subcomponents ── */

function QuizAnswerReview({ quizData, questions = [] }) {
  if (!quizData?.answers?.length) return null;
  return (
    <div className="admin-quiz-review">
      <div className="admin-quiz-score">
        Score: <strong>{quizData.totalScore}</strong> / {quizData.maxScore}
        {' '}({Math.round((quizData.totalScore / quizData.maxScore) * 100)}%)
      </div>
      {quizData.answers.map((a, i) => {
        const q = questions.find((qi) => qi.id === a.questionId);
        return (
          <div key={a.questionId} className={`admin-qa-row ${a.isCorrect ? 'qa-ok' : 'qa-no'}`}>
            <div className="admin-qa-num">Q{i + 1}</div>
            <div className="admin-qa-body">
              <div className="admin-qa-stem">{q?.stem?.en ?? a.questionId}</div>
              <div className="admin-qa-pts">{a.isCorrect ? '✓' : '✗'} {a.points}/{q?.scoring?.points ?? '?'} pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GradeForm({ assignmentId, userId, maxScore, existingGrade, onSaved }) {
  const [score,    setScore]    = useState(existingGrade?.score ?? '');
  const [feedback, setFeedback] = useState(existingGrade?.feedback ?? '');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  const handleSave = async () => {
    const s = parseFloat(score);
    if (isNaN(s) || s < 0 || s > maxScore) {
      setErr(`Score must be 0–${maxScore}`);
      return;
    }
    setSaving(true);
    setErr('');
    try {
      await submitGrade(assignmentId, userId, { score: s, feedback });
      onSaved({ score: s, feedback });
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-grade-form">
      <div className="admin-grade-row">
        <label className="admin-grade-label">Score (max {maxScore})</label>
        <input
          type="number"
          min={0}
          max={maxScore}
          className="admin-score-input"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
      </div>
      <div className="admin-grade-row">
        <label className="admin-grade-label">Feedback</label>
        <textarea
          className="admin-feedback-textarea"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional instructor feedback…"
          rows={3}
        />
      </div>
      {err && <div className="err-msg" style={{ marginBottom: 8 }}>{err}</div>}
      <button className="btn-submit" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : existingGrade ? 'Update Grade' : 'Save Grade'}
      </button>
    </div>
  );
}

/* ── main page ── */
export default function AdminPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [cohorts,     setCohorts]     = useState([]);

  // drill-down state
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions,        setSubmissions]        = useState([]);
  const [grades,             setGrades]             = useState({});
  const [loadingSubs,        setLoadingSubs]        = useState(false);
  const [selectedSub,        setSelectedSub]        = useState(null);
  const [savedGrades,        setSavedGrades]        = useState({});

  // top-level admin panel: 'grading' | 'content'
  const [adminPanel, setAdminPanel] = useState('grading');

  // course content state
  const [contentItems,   setContentItems]   = useState([]);
  const [contentLoaded,  setContentLoaded]  = useState(false);

  // right-panel tab: 'submissions' | 'gating'
  const [rightTab, setRightTab] = useState('submissions');

  useEffect(() => {
    Promise.all([
      getAdminAssignments().catch(() => []),
      getCohorts().catch(() => []),
    ]).then(([rawA, rawC]) => {
      const list = Array.isArray(rawA) ? rawA : (rawA.data ?? []);
      list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
      setAssignments(list);
      setCohorts(Array.isArray(rawC) ? rawC : []);
    }).finally(() => setLoading(false));
  }, []);

  const switchToContent = useCallback(() => {
    setAdminPanel('content');
    if (!contentLoaded) {
      getAdminCourseContent()
        .then((data) => { setContentItems(Array.isArray(data) ? data : []); setContentLoaded(true); })
        .catch(() => setContentLoaded(true));
    }
  }, [contentLoaded]);

  const openAssignment = useCallback(async (a) => {
    setSelectedAssignment(a);
    setSelectedSub(null);
    setRightTab('submissions');
    setLoadingSubs(true);
    try {
      const [subs, gradeList] = await Promise.all([
        getSubmissions(a.id),
        getGradesForAssignment(a.id),
      ]);
      setSubmissions(Array.isArray(subs) ? subs : []);
      const gradeMap = {};
      (Array.isArray(gradeList) ? gradeList : []).forEach((g) => {
        gradeMap[g.user_id] = g;
      });
      setGrades(gradeMap);
    } catch {}
    setLoadingSubs(false);
  }, []);

  const handleGradeSaved = useCallback((sub, result) => {
    setSavedGrades((s) => ({ ...s, [sub.id]: result }));
  }, []);

  const [publishing, setPublishing] = useState(false);
  const handleTogglePublish = useCallback(async () => {
    if (!selectedAssignment) return;
    setPublishing(true);
    try {
      const updated = await updateAssignment(selectedAssignment.id, { is_published: !selectedAssignment.is_published });
      setAssignments((prev) => prev.map((a) => a.id === updated.id ? { ...a, is_published: updated.is_published } : a));
      setSelectedAssignment((prev) => prev && { ...prev, is_published: updated.is_published });
    } catch {}
    setPublishing(false);
  }, [selectedAssignment]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="admin-page">
      <div className="admin-panel-tabs">
        <button
          className={`admin-panel-tab${adminPanel === 'grading' ? ' active' : ''}`}
          onClick={() => setAdminPanel('grading')}
        >
          Grade Center
        </button>
        <button
          className={`admin-panel-tab${adminPanel === 'content' ? ' active' : ''}`}
          onClick={switchToContent}
        >
          Course Content
        </button>
      </div>

      {adminPanel === 'content' ? (
        <CourseContentPanel
          items={contentItems}
          cohorts={cohorts}
          loaded={contentLoaded}
          onItemsChange={setContentItems}
        />
      ) : (
      <div className="admin-layout">
        {/* ── Left: section list ── */}
        <div className="admin-left">
          <div className="admin-assignment-list">
            {assignments.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
                No sections found.
              </p>
            )}
            {assignments.map((a) => {
              const color = TYPE_COLOR[a.type] ?? TYPE_COLOR.module;
              const isActive = selectedAssignment?.id === a.id;
              return (
                <button
                  key={a.id}
                  className={`admin-assign-btn${isActive ? ' active' : ''}`}
                  onClick={() => openAssignment(a)}
                >
                  <span className="admin-assign-type" style={{ color }}>
                    {a.type.toUpperCase()}
                    {!a.is_published && <span style={{ color: 'var(--muted)', marginLeft: 6 }}>draft</span>}
                  </span>
                  <span className="admin-assign-title">{a.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: submissions ── */}
        <div className="admin-right">
          {!selectedAssignment && (
            <div className="admin-empty">
              <p>Select a section to view submissions.</p>
            </div>
          )}

          {selectedAssignment && (
            <>
              <div className="admin-right-header">
                <div>
                  <div className="admin-right-title">{selectedAssignment.title}</div>
                  <div className="admin-right-sub">
                    {selectedAssignment.is_published
                      ? <span style={{ color: '#4ade80' }}>Published</span>
                      : <span style={{ color: 'var(--muted)' }}>Draft — not visible to students yet</span>}
                    {' · '}{submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="admin-back-btn"
                    style={selectedAssignment.is_published ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : { color: '#4ade80', borderColor: '#4ade80' }}
                    onClick={handleTogglePublish}
                    disabled={publishing}
                  >
                    {publishing ? '…' : selectedAssignment.is_published ? 'Unpublish' : 'Publish'}
                  </button>
                  {selectedSub && rightTab === 'submissions' && (
                    <button className="admin-back-btn" onClick={() => setSelectedSub(null)}>
                      ← All Submissions
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-right-tabs">
                <button
                  className={`admin-right-tab${rightTab === 'submissions' ? ' active' : ''}`}
                  onClick={() => { setRightTab('submissions'); setSelectedSub(null); }}
                >
                  Submissions
                </button>
                <button
                  className={`admin-right-tab${rightTab === 'gating' ? ' active' : ''}`}
                  onClick={() => { setRightTab('gating'); setSelectedSub(null); }}
                >
                  Access Gating
                </button>
                {selectedAssignment.type === 'survey' && (
                  <button
                    className={`admin-right-tab${rightTab === 'results' ? ' active' : ''}`}
                    onClick={() => { setRightTab('results'); setSelectedSub(null); }}
                  >
                    Results
                  </button>
                )}
              </div>

              {rightTab === 'results' ? (
                <SurveyResultsPanel key={selectedAssignment.id} assignmentId={selectedAssignment.id} />
              ) : rightTab === 'gating' ? (
                <GatingPanel
                  key={selectedAssignment.id}
                  assignment={selectedAssignment}
                  cohorts={cohorts}
                  onUnlocksChange={(updatedUnlocks) =>
                    setAssignments((prev) =>
                      prev.map((a) => a.id === selectedAssignment.id ? { ...a, unlocks: updatedUnlocks } : a)
                    )
                  }
                />
              ) : loadingSubs ? (
                <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div>
              ) : selectedSub ? (
                /* ── Submission detail + grade form ── */
                <SubmissionDetail
                  sub={selectedSub}
                  assignment={selectedAssignment}
                  existingGrade={savedGrades[selectedSub.id] ?? grades[selectedSub.user_id]}
                  onGradeSaved={(result) => handleGradeSaved(selectedSub, result)}
                />
              ) : (
                /* ── Submissions list ── */
                <SubmissionsList
                  submissions={submissions}
                  grades={grades}
                  savedGrades={savedGrades}
                  onSelect={setSelectedSub}
                />
              )}
            </>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

function SubmissionsList({ submissions, grades, savedGrades, onSelect }) {
  if (submissions.length === 0) {
    return <div className="admin-empty"><p>No submissions yet.</p></div>;
  }
  return (
    <div className="admin-sub-list">
      {submissions.map((s) => {
        const grade   = savedGrades[s.id] ?? grades[s.user_id];
        const graded  = grade != null;
        const pct     = graded ? Math.round((grade.score / (grade.max_score ?? 100)) * 100) : null;
        return (
          <button key={s.id} className="admin-sub-row" onClick={() => onSelect(s)}>
            <div className="admin-sub-avatar">
              {s.student?.first_name?.[0]}{s.student?.last_name?.[0]}
            </div>
            <div className="admin-sub-info">
              <div className="admin-sub-name">
                {s.student?.first_name} {s.student?.last_name}
              </div>
              <div className="admin-sub-meta">
                {s.status} · {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : 'in progress'}
              </div>
            </div>
            <div className="admin-sub-grade">
              {graded ? (
                <span className="admin-grade-chip" style={{ color: pct >= 70 ? '#10b981' : '#f59e0b' }}>
                  {grade.score}/{grade.max_score} ({pct}%)
                </span>
              ) : (
                <span className="admin-grade-chip ungraded">Not graded</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}


function SurveyResultsPanel({ assignmentId }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getSurveyResults(assignmentId)
      .then(setResults)
      .catch((e) => setError(e.response?.data?.error?.message ?? 'Failed to load results'))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div>;
  if (error) return <div className="admin-empty"><p className="err-msg">{error}</p></div>;
  if (!results) return null;

  if (results.results_suppressed) {
    return (
      <div className="admin-empty">
        <p>
          Only {results.response_count} response{results.response_count !== 1 ? 's' : ''} so far — results stay
          hidden until at least {results.minimum_responses} students have responded, to protect anonymity.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-gating" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <p className="admin-gating-desc" style={{ marginBottom: 0 }}>
        {results.response_count} response{results.response_count !== 1 ? 's' : ''} aggregated.
      </p>

      {results.sections.map((section) => (
        <div key={section.title}>
          <div className="section-label" style={{ marginBottom: 12 }}>{section.title}</div>

          {section.distributions.map((q) => (
            <div key={q.id} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>{q.prompt}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {q.options.map((opt) => (
                  <div key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', width: 140, flexShrink: 0 }}>{opt.label}</span>
                    <div className="scoreboard-bar-wrap" style={{ flex: 1 }}>
                      <div className="scoreboard-bar-fill" style={{ width: `${opt.percent}%`, background: 'var(--primary)' }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--muted)', width: 70, textAlign: 'right', flexShrink: 0 }}>
                      {opt.count} ({opt.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {section.text_responses.map((q) => (
            <div key={q.id} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8 }}>{q.prompt}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.responses.map((r, i) => (
                  <div key={i} className="feedback-row" style={{ borderBottom: 'none', padding: '8px 12px', background: 'var(--card-hi)', borderRadius: 'var(--radius-sm)' }}>
                    <div className="feedback-text">{r}</div>
                  </div>
                ))}
                {q.responses.length === 0 && <div className="empty-state" style={{ padding: '8px 0' }}>No responses yet.</div>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {results.recommendation_groups.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 12 }}>Recommendation Themes</div>
          {results.recommendation_groups.map((group) => (
            <div key={group.key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--bright)', marginBottom: 4 }}>
                {group.label} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({group.count})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GatingPanel({ assignment, cohorts, onUnlocksChange }) {
  const [unlockedIds, setUnlockedIds] = useState(
    () => new Set((assignment.unlocks ?? []).map((u) => u.cohort_id))
  );
  const [busy,   setBusy]   = useState({});
  const [errors, setErrors] = useState({});

  const toggle = async (cohortId) => {
    const isUnlocked = unlockedIds.has(cohortId);
    setBusy((b) => ({ ...b, [cohortId]: true }));
    setErrors((e) => ({ ...e, [cohortId]: null }));
    try {
      if (isUnlocked) {
        await lockAssignment(assignment.id, cohortId);
        setUnlockedIds((s) => { const n = new Set(s); n.delete(cohortId); return n; });
        onUnlocksChange((assignment.unlocks ?? []).filter((u) => u.cohort_id !== cohortId));
      } else {
        await unlockAssignment(assignment.id, cohortId);
        setUnlockedIds((s) => new Set([...s, cohortId]));
        onUnlocksChange([...(assignment.unlocks ?? []), { cohort_id: cohortId }]);
      }
    } catch (err) {
      setErrors((e) => ({ ...e, [cohortId]: err.response?.data?.error?.message ?? 'Action failed' }));
    } finally {
      setBusy((b) => ({ ...b, [cohortId]: false }));
    }
  };

  if (!cohorts.length) {
    return <div className="admin-empty"><p>No cohorts found for this course.</p></div>;
  }

  return (
    <div className="admin-gating">
      <p className="admin-gating-desc">
        Control which cohorts can access this assignment. Locked cohorts see a "not yet unlocked" message.
      </p>
      <div className="admin-gating-list">
        {cohorts.map((c) => {
          const unlocked = unlockedIds.has(c.id);
          return (
            <div key={c.id} className="admin-gating-row">
              <div className="admin-gating-info">
                <span className="admin-gating-name">{c.name}</span>
                <span className={`admin-gating-badge ${unlocked ? 'badge-unlocked' : 'badge-locked'}`}>
                  {unlocked ? '🔓 Unlocked' : '🔒 Locked'}
                </span>
              </div>
              {errors[c.id] && (
                <div className="err-msg" style={{ fontSize: 11, padding: '4px 0' }}>{errors[c.id]}</div>
              )}
              <button
                className={`admin-gate-btn ${unlocked ? 'gate-lock' : 'gate-unlock'}`}
                onClick={() => toggle(c.id)}
                disabled={busy[c.id]}
              >
                {busy[c.id] ? '…' : unlocked ? 'Lock' : 'Unlock'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubmissionDetail({ sub, assignment, existingGrade, onGradeSaved }) {
  const [savedGrade, setSavedGrade] = useState(existingGrade);
  const parsed = parseContent(sub.content);

  const handleSaved = (result) => {
    setSavedGrade(result);
    onGradeSaved(result);
  };

  return (
    <div className="admin-detail">
      {/* Student info */}
      <div className="admin-detail-header">
        <div className="admin-sub-avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
          {sub.student?.first_name?.[0]}{sub.student?.last_name?.[0]}
        </div>
        <div>
          <div className="admin-detail-name">{sub.student?.first_name} {sub.student?.last_name}</div>
          <div className="admin-sub-meta">
            {sub.status} · submitted {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '—'}
          </div>
        </div>
        {savedGrade && (
          <div className="admin-grade-chip" style={{ marginLeft: 'auto', color: '#10b981', fontSize: 15 }}>
            {savedGrade.score}/{assignment.max_score}
          </div>
        )}
      </div>

      {/* Submission content */}
      <div className="admin-content-box">
        <div className="section-label" style={{ marginBottom: 12 }}>Submission</div>
        {parsed.type === 'quiz' ? (
          <QuizAnswerReview quizData={parsed.data} questions={assignment.questions ?? []} />
        ) : (
          <pre className="admin-text-content">{parsed.data || '(no content)'}</pre>
        )}
      </div>

      {/* Grade form */}
      <div className="admin-content-box">
        <div className="section-label" style={{ marginBottom: 12 }}>
          {savedGrade ? 'Update Grade' : 'Grade Submission'}
        </div>
        <GradeForm
          assignmentId={assignment.id}
          userId={sub.user_id}
          maxScore={parseFloat(assignment.max_score ?? 100)}
          existingGrade={savedGrade}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COURSE CONTENT PANEL
═══════════════════════════════════════════════════════════ */

const CONTENT_TYPES = ['agenda', 'slides', 'handout', 'resource', 'form'];
const CONTENT_TYPE_LABELS = { slides: 'Slides', handout: 'Handouts', agenda: 'Agenda', form: 'Forms', resource: 'Resources' };

function CourseContentPanel({ items, cohorts, loaded, onItemsChange }) {
  const [selected,  setSelected]  = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [collapsed, setCollapsed] = useState({});

  if (!loaded) return <div className="loading-screen"><div className="spinner" /></div>;

  const toggleGroup = (type) => setCollapsed((c) => ({ ...c, [type]: !c[type] }));

  const groups = CONTENT_TYPES
    .map((type) => ({ type, items: items.filter((i) => i.content_type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="admin-layout">
      <div className="admin-left">
        <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="section-label">Content Items</span>
          <button className="btn-sm-primary" onClick={() => { setShowForm(true); setSelected(null); }}>+ Add</button>
        </div>
        <div className="admin-content-groups">
          {items.length === 0 && <div className="empty-state" style={{ padding: '24px 16px' }}>No content yet.</div>}
          {groups.map(({ type, items: groupItems }) => {
            const isOpen = !collapsed[type];
            return (
              <div key={type} className="admin-content-group">
                <button className="admin-content-group-header" onClick={() => toggleGroup(type)}>
                  <span className="admin-content-group-dot" />
                  <span className="admin-content-group-name">{CONTENT_TYPE_LABELS[type]}</span>
                  <span className="sidebar-group-count">{groupItems.length}</span>
                  <span className={`course-day-chevron${isOpen ? ' open' : ''}`}>›</span>
                </button>
                {isOpen && (
                  <div className="admin-assignment-list">
                    {groupItems.map((item) => (
                      <div
                        key={item.id}
                        className={`admin-assignment-row${selected?.id === item.id ? ' selected' : ''}`}
                        onClick={() => { setSelected(item); setShowForm(false); }}
                      >
                        <div className="admin-a-title">{item.title}</div>
                        <div className="admin-a-meta">
                          {item.is_published
                            ? <span style={{ fontSize: 10, color: '#4ade80' }}>Published</span>
                            : <span style={{ fontSize: 10, color: '#94a3b8' }}>Draft</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-right">
        {showForm ? (
          <ContentItemForm
            onSaved={(newItem) => { onItemsChange((p) => [newItem, ...p]); setShowForm(false); setSelected(newItem); }}
            onCancel={() => setShowForm(false)}
          />
        ) : selected ? (
          <ContentItemDetail
            item={selected}
            cohorts={cohorts}
            onUpdated={(updated) => { onItemsChange((p) => p.map((i) => i.id === updated.id ? updated : i)); setSelected(updated); }}
            onDeleted={(id) => { onItemsChange((p) => p.filter((i) => i.id !== id)); setSelected(null); }}
          />
        ) : (
          <div className="admin-empty-right">
            <p>Select a content item or click <strong>+ Add</strong> to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ContentItemForm({ onSaved, onCancel }) {
  const [mode,        setMode]        = useState('link');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('slides');
  const [url,         setUrl]         = useState('');
  const [file,        setFile]        = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setErr('Title is required'); return; }
    if (mode === 'link' && !url.trim()) { setErr('URL is required'); return; }
    if (mode === 'upload' && !file) { setErr('Please select a file'); return; }
    setSaving(true); setErr('');
    try {
      const item = mode === 'upload'
        ? await uploadContentFile(file, { title: title.trim(), description, content_type: contentType })
        : await createContentLink({ title: title.trim(), description, content_type: contentType, url: url.trim() });
      onSaved(item);
    } catch (e) { setErr(e.message ?? 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="content-form">
      <div className="section-label" style={{ marginBottom: 16 }}>New Content Item</div>
      <div className="cc-form-mode-tabs">
        <button className={`cc-mode-tab${mode === 'link' ? ' active' : ''}`} onClick={() => setMode('link')}>🔗 Link URL</button>
        <button className={`cc-mode-tab${mode === 'upload' ? ' active' : ''}`} onClick={() => setMode('upload')}>📤 Upload File</button>
      </div>
      <div className="form-field"><label>Title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Day 1 Slides" /></div>
      <div className="form-field"><label>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" /></div>
      <div className="form-field">
        <label>Type</label>
        <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
          {CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
        </select>
      </div>
      {mode === 'link' ? (
        <div className="form-field"><label>URL *</label><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/presentation/…" /></div>
      ) : (
        <div className="form-field"><label>File * (PDF, PPTX, DOCX — max 20 MB)</label><input type="file" accept=".pdf,.pptx,.docx,.xlsx,.zip" onChange={(e) => setFile(e.target.files[0] ?? null)} /></div>
      )}
      {err && <div className="err-msg">{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button className="btn-submit" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ContentItemDetail({ item, cohorts, onUpdated, onDeleted }) {
  const [editing,     setEditing]     = useState(false);
  const [title,       setTitle]       = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [isPublished, setIsPublished] = useState(item.is_published);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');

  useEffect(() => {
    setTitle(item.title); setDescription(item.description ?? ''); setIsPublished(item.is_published);
  }, [item.id]);

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      const updated = await updateContentItem(item.id, { title, description, is_published: isPublished });
      onUpdated(updated); setEditing(false);
    } catch { setErr('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try { await deleteContentItem(item.id); onDeleted(item.id); } catch { setErr('Delete failed'); }
  };

  const [publishing, setPublishing] = useState(false);
  const handleTogglePublish = async () => {
    setPublishing(true);
    try {
      const updated = await updateContentItem(item.id, { is_published: !item.is_published });
      onUpdated(updated);
      setIsPublished(updated.is_published);
    } catch { setErr('Publish toggle failed'); }
    finally { setPublishing(false); }
  };

  const unlockedIds = new Set((item.unlocks ?? []).map((u) => u.cohort_id));

  const handleToggle = async (cohortId) => {
    try {
      if (unlockedIds.has(cohortId)) {
        await lockContentItem(item.id, cohortId);
        onUpdated({ ...item, unlocks: (item.unlocks ?? []).filter((u) => u.cohort_id !== cohortId) });
      } else {
        await unlockContentItem(item.id, cohortId);
        const cohort = cohorts.find((c) => c.id === cohortId);
        onUpdated({ ...item, unlocks: [...(item.unlocks ?? []), { cohort_id: cohortId, cohort }] });
      }
    } catch { setErr('Toggle failed'); }
  };

  return (
    <div className="content-detail">
      {editing ? (
        <>
          <div className="section-label" style={{ marginBottom: 12 }}>Edit Item</div>
          <div className="form-field"><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="form-field"><label>Description</label><input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="form-field">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} /> Published
            </label>
          </div>
          {err && <div className="err-msg">{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn-submit" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 4 }}>{CONTENT_TYPE_LABELS[item.content_type]}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--bright)' }}>{item.title}</div>
              {item.description && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{item.description}</div>}
              <div style={{ fontSize: 12, marginTop: 6 }}>
                {item.is_published
                  ? <span style={{ color: '#4ade80' }}>Published</span>
                  : <span style={{ color: 'var(--muted)' }}>Draft — not visible to students yet, even if released to a cohort below</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                className="admin-back-btn"
                style={item.is_published ? { color: 'var(--danger)', borderColor: 'var(--danger)' } : { color: '#4ade80', borderColor: '#4ade80' }}
                onClick={handleTogglePublish}
                disabled={publishing}
              >
                {publishing ? '…' : item.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <button className="btn-sm-primary" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn-sm-danger" onClick={handleDelete}>Delete</button>
            </div>
          </div>
          {item.url && (
            <div style={{ marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 4 }}>URL</div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--primary)', wordBreak: 'break-all' }}>{item.url}</a>
            </div>
          )}
          {item.file_name && (
            <div style={{ marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 4 }}>File</div>
              <span style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>📄 {item.file_name}</span>
            </div>
          )}
          <div className="section-label" style={{ marginBottom: 8 }}>Cohort Access</div>
          <div className="scenario-gating-cohorts">
            {cohorts.map((c) => {
              const isUnlocked = unlockedIds.has(c.id);
              return (
                <div key={c.id} className="gating-cohort-row">
                  <span className="gating-cohort-name">{c.name}</span>
                  <button className={`gating-toggle-btn ${isUnlocked ? 'unlocked' : 'locked'}`} onClick={() => handleToggle(c.id)}>
                    {isUnlocked ? '🔓 Released' : '🔒 Locked'}
                  </button>
                </div>
              );
            })}
            {cohorts.length === 0 && <div className="empty-state">No cohorts found.</div>}
          </div>
          {err && <div className="err-msg" style={{ marginTop: 8 }}>{err}</div>}
        </>
      )}
    </div>
  );
}
