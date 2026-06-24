import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  getAdminAssignments,
  getSubmissions,
  getGradesForAssignment,
  submitGrade,
  submitSquadGrade,
  getCohorts,
  unlockAssignment,
  lockAssignment,
  getScenarios,
  browseScenarioR2,
  getCourseContent,
  createContentLink,
  uploadContentFile,
  updateContentItem,
  deleteContentItem,
  unlockContentItem,
  lockContentItem,
  getCampaignDrops,
  createCampaignDrop,
  updateCampaignDrop,
  deleteCampaignDrop,
  releaseCampaignDrop,
  lockCampaignDrop,
  updateCohort,
  getSquadsByCohort,
  updateSquad,
  quickReleaseScenario,
  updateScenario,
  deleteScenario,
  updateAssignment,
} from '../api/pact.js';

const TYPE_COLOR = {
  module:     '#2563eb',
  game:       '#059669',
  assessment: '#d97706',
  survey:     '#7c3aed',
  challenge:  '#dc2626',
  capstone:   '#b45309',
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

function GradeForm({ assignmentId, userId, squadId, isSquad, maxScore, existingGrade, onSaved }) {
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
      if (isSquad && squadId) {
        await submitSquadGrade(assignmentId, squadId, { score: s, feedback });
      } else {
        await submitGrade(assignmentId, userId, { score: s, feedback });
      }
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

  // top-level admin panel: 'grading' | 'scenarios' | 'content' | 'library' | 'campaign'
  const [adminPanel, setAdminPanel] = useState('grading');

  // course content state
  const [contentItems,   setContentItems]   = useState([]);
  const [contentLoaded,  setContentLoaded]  = useState(false);

  // right-panel tab: 'submissions' | 'gating'
  const [rightTab, setRightTab] = useState('submissions');

  // filter: 'individual' | 'squad'
  const [modeFilter, setModeFilter] = useState('individual');

  useEffect(() => {
    Promise.all([
      getAdminAssignments().catch(() => []),
      getCohorts().catch(() => []),
    ]).then(([rawA, rawC]) => {
      setAssignments(Array.isArray(rawA) ? rawA : (rawA.data ?? []));
      setCohorts(Array.isArray(rawC) ? rawC : []);
    }).finally(() => setLoading(false));
  }, []);

  const switchToContent = useCallback(() => {
    setAdminPanel('content');
    if (!contentLoaded) {
      getCourseContent()
        .then((data) => { setContentItems(Array.isArray(data) ? data : []); setContentLoaded(true); })
        .catch(() => setContentLoaded(true));
    }
  }, [contentLoaded]);

  const switchToLibrary = useCallback(() => setAdminPanel('library'), []);

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

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const filtered = assignments.filter((a) => a.grading_mode === modeFilter);

  /* group squad assignments by squad */
  function groupBySquad(subs) {
    const groups = {};
    subs.forEach((s) => {
      const key = s.squad?.id ?? 'unassigned';
      if (!groups[key]) groups[key] = { squad: s.squad, subs: [] };
      groups[key].subs.push(s);
    });
    return Object.values(groups).sort((a, b) => (a.squad?.number ?? 999) - (b.squad?.number ?? 999));
  }

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
        <button
          className={`admin-panel-tab${adminPanel === 'library' ? ' active' : ''}`}
          onClick={switchToLibrary}
        >
          Content Gating
        </button>
      </div>

      {adminPanel === 'library' ? (
        <ContentGatingPanel
          assignments={assignments}
          cohorts={cohorts}
          contentItems={contentItems}
          onAssignmentsChange={setAssignments}
          onContentPublished={() => setContentLoaded(false)}
        />
      ) : adminPanel === 'content' ? (
        <CourseContentPanel
          items={contentItems}
          cohorts={cohorts}
          loaded={contentLoaded}
          onItemsChange={setContentItems}
          assignments={assignments}
        />
      ) : (
      <div className="admin-layout">
        {/* ── Left: assignment list ── */}
        <div className="admin-left">
          <div className="admin-mode-tabs">
            <button
              className={`admin-mode-tab${modeFilter === 'individual' ? ' active' : ''}`}
              onClick={() => { setModeFilter('individual'); setSelectedAssignment(null); }}
            >
              Individual
            </button>
            <button
              className={`admin-mode-tab${modeFilter === 'squad' ? ' active' : ''}`}
              onClick={() => { setModeFilter('squad'); setSelectedAssignment(null); }}
            >
              Squad
            </button>
          </div>

          <div className="admin-assignment-list">
            {filtered.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
                No {modeFilter} assignments.
              </p>
            )}
            {(() => {
              const nonChallenges = filtered.filter((a) => a.type !== 'challenge');
              const challenges    = filtered.filter((a) => a.type === 'challenge');

              // Group challenges by scenario_name; null → '__unassigned__'
              const scenMap = new Map();
              for (const a of challenges) {
                const key = a.scenario_name ?? '__unassigned__';
                if (!scenMap.has(key)) scenMap.set(key, []);
                scenMap.get(key).push(a);
              }
              const scenGroups = [...scenMap.entries()].sort(([a], [b]) => {
                if (a === '__unassigned__') return 1;
                if (b === '__unassigned__') return -1;
                return a.localeCompare(b);
              });
              for (const items of scenMap.values()) items.sort((a, b) => a.order_index - b.order_index);

              const renderBtn = (a) => {
                const color    = TYPE_COLOR[a.type] ?? TYPE_COLOR.module;
                const isActive = selectedAssignment?.id === a.id;
                return (
                  <button
                    key={a.id}
                    className={`admin-assign-btn${isActive ? ' active' : ''}`}
                    onClick={() => openAssignment(a)}
                  >
                    <span className="admin-assign-type" style={{ color }}>{a.type.toUpperCase()}</span>
                    <span className="admin-assign-title">{a.title}</span>
                  </button>
                );
              };

              return (
                <>
                  {nonChallenges.map(renderBtn)}

                  {scenGroups.length > 0 && (
                    <>
                      {nonChallenges.length > 0 && (
                        <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                      )}
                      {scenGroups.map(([key, items]) => (
                        <div key={String(key)}>
                          <div style={{
                            padding: '6px 14px 3px',
                            fontFamily: 'var(--mono)', fontSize: 9,
                            letterSpacing: '.14em', color: 'var(--primary)',
                            textTransform: 'uppercase',
                          }}>
                            {scenarioLabel(key === '__unassigned__' ? null : key)}
                          </div>
                          {items.map(renderBtn)}
                        </div>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* ── Right: submissions ── */}
        <div className="admin-right">
          {!selectedAssignment && (
            <div className="admin-empty">
              <p>Select an assignment to view submissions.</p>
            </div>
          )}

          {selectedAssignment && (
            <>
              <div className="admin-right-header">
                <div>
                  <div className="admin-right-title">{selectedAssignment.title}</div>
                  <div className="admin-right-sub">
                    {selectedAssignment.grading_mode === 'squad' ? 'Squad graded' : 'Individually graded'}
                    {' · '}{submissions.length} submission{submissions.length !== 1 ? 's' : ''}
                  </div>
                </div>
                {selectedSub && rightTab === 'submissions' && (
                  <button className="admin-back-btn" onClick={() => setSelectedSub(null)}>
                    ← All Submissions
                  </button>
                )}
              </div>

              <div className="admin-right-tabs">
                <button
                  className={`admin-right-tab${rightTab === 'submissions' ? ' active' : ''}`}
                  onClick={() => { setRightTab('submissions'); setSelectedSub(null); }}
                >
                  Submissions
                </button>
                {selectedAssignment.type !== 'module' && (
                  <button
                    className={`admin-right-tab${rightTab === 'gating' ? ' active' : ''}`}
                    onClick={() => { setRightTab('gating'); setSelectedSub(null); }}
                  >
                    Access Gating
                  </button>
                )}
              </div>

              {rightTab === 'gating' ? (
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
              ) : selectedAssignment.grading_mode === 'squad' ? (
                /* ── Squad submissions grouped by squad ── */
                <SquadSubmissions
                  groups={groupBySquad(submissions)}
                  grades={grades}
                  savedGrades={savedGrades}
                  assignment={selectedAssignment}
                  onSelect={setSelectedSub}
                  onGradeSaved={handleGradeSaved}
                />
              ) : (
                /* ── Individual submissions list ── */
                <IndividualSubmissions
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

function IndividualSubmissions({ submissions, grades, savedGrades, onSelect }) {
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

function SquadSubmissions({ groups, grades, savedGrades, assignment, onSelect, onGradeSaved }) {
  const [openSquad, setOpenSquad] = useState(null);

  if (groups.length === 0) {
    return <div className="admin-empty"><p>No submissions yet.</p></div>;
  }

  return (
    <div className="admin-squad-list">
      {groups.map((group) => {
        const squadId   = group.squad?.id;
        const squadNum  = group.squad?.number ?? '?';
        const squadName = group.squad?.name;
        const isOpen    = openSquad === squadId;
        const anyGrade  = group.subs.some((s) => savedGrades[s.id] ?? grades[s.user_id]);

        return (
          <div key={squadId ?? 'unassigned'} className="admin-squad-group">
            <button
              className={`admin-squad-header${isOpen ? ' open' : ''}`}
              onClick={() => setOpenSquad(isOpen ? null : squadId)}
            >
              <span className="admin-squad-label">
                {group.squad ? `Squad ${squadNum}${squadName ? ` · ${squadName}` : ''}` : 'Unassigned'}
              </span>
              <span className="admin-squad-count">{group.subs.length} submission{group.subs.length !== 1 ? 's' : ''}</span>
              {anyGrade && <span className="admin-squad-graded-dot" />}
              <span className="admin-squad-chevron">{isOpen ? '⌄' : '›'}</span>
            </button>

            {isOpen && (
              <div className="admin-squad-body">
                {/* Squad-level grade form */}
                {squadId && (
                  <div className="admin-squad-grade-block">
                    <div className="section-label" style={{ marginBottom: 10 }}>Grade entire squad</div>
                    <GradeForm
                      assignmentId={assignment.id}
                      squadId={squadId}
                      isSquad={true}
                      maxScore={parseFloat(assignment.max_score ?? 100)}
                      existingGrade={null}
                      onSaved={(result) => {
                        group.subs.forEach((s) => onGradeSaved(s, result));
                      }}
                    />
                  </div>
                )}

                {/* Individual submissions within squad */}
                <div className="section-label" style={{ margin: '16px 0 10px' }}>Submissions</div>
                {group.subs.map((s) => {
                  const grade  = savedGrades[s.id] ?? grades[s.user_id];
                  const graded = grade != null;
                  const pct    = graded ? Math.round((grade.score / (grade.max_score ?? 100)) * 100) : null;
                  return (
                    <button key={s.id} className="admin-sub-row" onClick={() => onSelect(s)}>
                      <div className="admin-sub-avatar">
                        {s.student?.first_name?.[0]}{s.student?.last_name?.[0]}
                      </div>
                      <div className="admin-sub-info">
                        <div className="admin-sub-name">{s.student?.first_name} {s.student?.last_name}</div>
                        <div className="admin-sub-meta">{s.status} · {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : 'in progress'}</div>
                      </div>
                      <div className="admin-sub-grade">
                        {graded
                          ? <span className="admin-grade-chip" style={{ color: pct >= 70 ? '#10b981' : '#f59e0b' }}>{grade.score}/{grade.max_score} ({pct}%)</span>
                          : <span className="admin-grade-chip ungraded">Not graded</span>
                        }
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatR2Size(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Content Gating Panel ── */

const R2_SCENARIOS_PREFIX = 'pact/scenarios/';

function ContentGatingPanel({ assignments, cohorts, contentItems = [], onAssignmentsChange, onContentPublished }) {
  const [subTab,            setSubTab]            = useState('drops');
  const [refreshKey,        setRefreshKey]        = useState(0);
  const [selectedScenario,  setSelectedScenario]  = useState(null);
  const [scenarioFolders,   setScenarioFolders]   = useState(null); // null = loading

  useEffect(() => {
    browseScenarioR2(R2_SCENARIOS_PREFIX)
      .then((d) => setScenarioFolders((d.folders ?? []).map((f) => f.name)))
      .catch(() => setScenarioFolders([]));
  }, []);

  const assessmentItems = assignments.filter((a) => a.type === 'assessment' || a.type === 'survey');
  const moduleItems     = assignments.filter((a) => a.type === 'module');
  const challengeItems  = assignments.filter((a) => a.type === 'challenge');

  const handlePublished = () => {
    setRefreshKey((k) => k + 1);
    onContentPublished?.();
  };

  const handleUnlocksChange = (id, unlocks) =>
    onAssignmentsChange((prev) => prev.map((a) => a.id === id ? { ...a, unlocks } : a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="admin-mode-tabs" style={{ padding: '0 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button className={`admin-mode-tab${subTab === 'drops'      ? ' active' : ''}`} onClick={() => setSubTab('drops')}>
          Scenario Drops
        </button>
        <button className={`admin-mode-tab${subTab === 'challenges' ? ' active' : ''}`} onClick={() => setSubTab('challenges')}>
          Challenges
        </button>
        <button className={`admin-mode-tab${subTab === 'modules'    ? ' active' : ''}`} onClick={() => setSubTab('modules')}>
          Modules
        </button>
        <button className={`admin-mode-tab${subTab === 'gates'      ? ' active' : ''}`} onClick={() => setSubTab('gates')}>
          Assessments &amp; Surveys
        </button>
        <button className={`admin-mode-tab${subTab === 'library'    ? ' active' : ''}`} onClick={() => setSubTab('library')}>
          Intel Library
        </button>
      </div>

      {subTab === 'drops' && (
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {!selectedScenario ? (
            /* ── Scenario picker ── */
            <>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)', marginBottom: 4 }}>
                SELECT SCENARIO
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
                Choose a scenario to browse and release R2 intel packages.
              </p>
              {scenarioFolders === null ? (
                <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></div>
              ) : scenarioFolders.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>No scenario folders found at <code>{R2_SCENARIOS_PREFIX}</code>.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
                  {scenarioFolders.map((name) => (
                    <button
                      key={name}
                      onClick={() => setSelectedScenario(name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', background: 'var(--surface)',
                        border: '1px solid var(--border)', borderRadius: 6,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 18 }}>📁</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bright)' }}>
                          {scenarioLabel(name)}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2, letterSpacing: '.06em' }}>
                          {R2_SCENARIOS_PREFIX}{name}/
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ── Scoped scenario view ── */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <button
                  onClick={() => setSelectedScenario(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 12, fontFamily: 'var(--mono)', padding: 0, letterSpacing: '.06em' }}
                >
                  ← ALL SCENARIOS
                </button>
                <span style={{ color: 'var(--border)' }}>/</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--bright)', letterSpacing: '.06em' }}>
                  {scenarioLabel(selectedScenario)}
                </span>
              </div>
              <R2PublishBrowser
                key={selectedScenario}
                rootPrefix={`${R2_SCENARIOS_PREFIX}${selectedScenario}/`}
                cohorts={cohorts}
                onPublished={handlePublished}
              />
              <ReleasesManager
                key={refreshKey}
                scenarioFilter={selectedScenario}
                onRefresh={() => setRefreshKey((k) => k + 1)}
              />
            </>
          )}
        </div>
      )}

      {subTab === 'challenges' && (
        <ChallengesGating
          assignments={challengeItems}
          cohorts={cohorts}
          onUnlocksChange={handleUnlocksChange}
          onAssignmentsChange={onAssignmentsChange}
        />
      )}

      {subTab === 'modules' && (
        <ModulesGating
          assignments={moduleItems}
          cohorts={cohorts}
          contentItems={contentItems}
          onUnlocksChange={handleUnlocksChange}
        />
      )}

      {subTab === 'gates' && (
        <AssessmentSurveyGating
          assignments={assessmentItems}
          cohorts={cohorts}
          onUnlocksChange={(id, unlocks) => handleUnlocksChange(id, unlocks)}
        />
      )}

      {subTab === 'library' && (
        <IntelLibraryGating
          contentItems={contentItems}
          cohorts={cohorts}
          moduleAssignments={moduleItems}
          onItemAdded={onContentPublished}
        />
      )}
    </div>
  );
}

/* ── Intel Library Gating ── */
function IntelLibraryGating({ contentItems, cohorts, moduleAssignments = [], onItemAdded }) {
  const [selected,   setSelected]   = useState(null);
  const [showR2,     setShowR2]     = useState(false);
  const [localItems, setLocalItems] = useState(contentItems);

  useEffect(() => { setLocalItems(contentItems); }, [contentItems]);

  const handleItemAdded = () => {
    setShowR2(false);
    onItemAdded?.();
  };

  const handleItemUpdated = (updated) => {
    setLocalItems((prev) => prev.map((i) => i.id === updated.id ? updated : i));
    setSelected(updated);
  };

  // Group items: by linked module first, then unlinked by content_type
  const moduleMap = new Map();
  const unlinked  = [];
  for (const item of localItems) {
    if (item.linked_assignment_id) {
      const mod = moduleAssignments.find((m) => m.id === item.linked_assignment_id);
      const key = mod ? mod.title : item.linked_assignment_id;
      if (!moduleMap.has(key)) moduleMap.set(key, { mod, items: [] });
      moduleMap.get(key).items.push(item);
    } else {
      unlinked.push(item);
    }
  }
  const moduleGroups = [...moduleMap.entries()].sort(([a], [b]) => {
    const ai = moduleAssignments.findIndex((m) => m.title === a);
    const bi = moduleAssignments.findIndex((m) => m.title === b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const renderItem = (item) => (
    <button
      key={item.id}
      className={`admin-assign-btn${selected?.id === item.id ? ' active' : ''}`}
      onClick={() => setSelected(item)}
    >
      <span className="admin-assign-type" style={{ fontSize: 9 }}>
        {(CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type).toUpperCase()}
      </span>
      <span className="admin-assign-title">{item.title}</span>
      {!item.is_published && (
        <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 4 }}>DRAFT</span>
      )}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* R2 browser section */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 16px', flexShrink: 0 }}>
        <button
          onClick={() => setShowR2((b) => !b)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
        >
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)' }}>
            ADD FROM R2
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 10, fontFamily: 'var(--mono)' }}>{showR2 ? '▲' : '▼'}</span>
        </button>
      </div>
      {showR2 && (
        <div style={{ maxHeight: 380, overflowY: 'auto', borderBottom: '1px solid var(--border)', padding: '10px 16px', flexShrink: 0, background: 'var(--surface)' }}>
          <R2PublishBrowser
            rootPrefix=""
            cohorts={[]}
            hideRelease
            onPublished={handleItemAdded}
          />
        </div>
      )}

      {/* Items list + cohort access split */}
      <div className="admin-layout" style={{ flex: 1, overflow: 'hidden' }}>
        <div className="admin-left" style={{ overflowY: 'auto' }}>
          {localItems.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
              No items yet. Use <strong>ADD FROM R2</strong> to publish files.
            </p>
          )}

          {moduleGroups.map(([modTitle, { items }]) => (
            <div key={modTitle}>
              <div style={{ padding: '6px 14px 3px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--primary)', textTransform: 'uppercase' }}>
                {modTitle}
              </div>
              {items.map(renderItem)}
            </div>
          ))}

          {unlinked.length > 0 && (
            <div>
              {moduleGroups.length > 0 && (
                <div style={{ padding: '6px 14px 3px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Unlinked
                </div>
              )}
              {unlinked.map(renderItem)}
            </div>
          )}
        </div>

        <div className="admin-right">
          {!selected ? (
            <div className="admin-empty">
              <p>Select an item to manage cohort access.</p>
            </div>
          ) : (
            <IntelItemCohortAccess
              key={selected.id}
              item={selected}
              cohorts={cohorts}
              onUpdated={handleItemUpdated}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function IntelItemCohortAccess({ item, cohorts, onUpdated }) {
  const [err, setErr] = useState('');
  const unlockedIds = new Set((item.unlocks ?? []).map((u) => u.cohort_id));

  const handleToggle = async (cohortId) => {
    setErr('');
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
    <div>
      <div className="admin-right-header">
        <div>
          <div className="admin-right-title">{item.title}</div>
          <div className="admin-right-sub">
            {CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type}
            {item.is_published ? ' · Published' : ' · Draft'}
          </div>
        </div>
      </div>
      <div className="section-label" style={{ margin: '16px 20px 8px' }}>Cohort Access</div>
      <div style={{ padding: '0 20px' }}>
        {cohorts.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No cohorts found.</p>
        )}
        {cohorts.map((c) => {
          const isUnlocked = unlockedIds.has(c.id);
          return (
            <div key={c.id} className="gating-cohort-row">
              <span className="gating-cohort-name">{c.name}</span>
              <button
                className={`gating-toggle-btn ${isUnlocked ? 'unlocked' : 'locked'}`}
                onClick={() => handleToggle(c.id)}
              >
                {isUnlocked ? '🔓 Released' : '🔒 Locked'}
              </button>
            </div>
          );
        })}
        {err && <div className="err-msg" style={{ marginTop: 8 }}>{err}</div>}
      </div>
    </div>
  );
}

/* ── Existing Releases Manager ── */
function ReleasesManager({ onRefresh, scenarioFilter = null }) {
  const [packages, setPackages] = useState(null);
  const [open, setOpen]         = useState(!!scenarioFilter);
  const [editing, setEditing]   = useState({});   // id → draft title string
  const [saving, setSaving]     = useState({});    // id → bool
  const [deleting, setDeleting] = useState({});    // id → bool

  useEffect(() => {
    getScenarios().then((d) => setPackages(Array.isArray(d) ? d : [])).catch(() => setPackages([]));
  }, []);

  if (!packages) return null;

  const visible = scenarioFilter
    ? packages.filter((p) => p.scenario_name === scenarioFilter)
    : packages;

  if (visible.length === 0) return null;

  // Group by scenario_name, sorted by release_number within each group
  const scenarioMap = new Map();
  for (const pkg of visible) {
    const key = pkg.scenario_name || pkg.title;
    if (!scenarioMap.has(key)) scenarioMap.set(key, []);
    scenarioMap.get(key).push(pkg);
  }
  for (const arr of scenarioMap.values()) arr.sort((a, b) => a.release_number - b.release_number);
  const groups = [...scenarioMap.entries()].sort(([a], [b]) => a.localeCompare(b));

  const handleSave = async (pkg) => {
    const newTitle = (editing[pkg.id] ?? pkg.title).trim();
    if (!newTitle || newTitle === pkg.title) { setEditing((e) => { const n = { ...e }; delete n[pkg.id]; return n; }); return; }
    setSaving((s) => ({ ...s, [pkg.id]: true }));
    try {
      await updateScenario(pkg.id, { title: newTitle });
      setPackages((prev) => prev.map((p) => p.id === pkg.id ? { ...p, title: newTitle } : p));
      setEditing((e) => { const n = { ...e }; delete n[pkg.id]; return n; });
    } catch { /* ignore */ } finally {
      setSaving((s) => { const n = { ...s }; delete n[pkg.id]; return n; });
    }
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Delete release "${pkg.title}"? This cannot be undone.`)) return;
    setDeleting((d) => ({ ...d, [pkg.id]: true }));
    try {
      await deleteScenario(pkg.id);
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      onRefresh?.();
    } catch { /* ignore */ } finally {
      setDeleting((d) => { const n = { ...d }; delete n[pkg.id]; return n; });
    }
  };

  return (
    <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: open ? 14 : 0 }}
      >
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)' }}>
          {scenarioFilter ? `${scenarioLabel(scenarioFilter).toUpperCase()} — RELEASES` : 'EXISTING RELEASES'}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 10, fontFamily: 'var(--mono)' }}>
          {open ? '▲' : '▼'} ({visible.length})
        </span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map(([sn, releases]) => (
            <div key={sn}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                {scenarioLabel(sn)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {releases.map((pkg, idx) => {
                  const isEditing = pkg.id in editing;
                  return (
                    <div
                      key={pkg.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                    >
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', minWidth: 28, flexShrink: 0 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editing[pkg.id]}
                          onChange={(e) => setEditing((d) => ({ ...d, [pkg.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(pkg); if (e.key === 'Escape') setEditing((d) => { const n = { ...d }; delete n[pkg.id]; return n; }); }}
                          style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--primary)', borderRadius: 4, padding: '3px 7px', color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}
                        />
                      ) : (
                        <span style={{ flex: 1, color: 'var(--text)' }}>{pkg.title}</span>
                      )}
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSave(pkg)}
                            disabled={saving[pkg.id]}
                            style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 8px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                          >
                            {saving[pkg.id] ? '...' : 'SAVE'}
                          </button>
                          <button
                            onClick={() => setEditing((d) => { const n = { ...d }; delete n[pkg.id]; return n; })}
                            style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '3px 8px', background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditing((d) => ({ ...d, [pkg.id]: pkg.title }))}
                            title="Edit title"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px 4px', fontSize: 13, lineHeight: 1 }}
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleDelete(pkg)}
                            disabled={deleting[pkg.id]}
                            title="Delete release"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', fontSize: 12, lineHeight: 1 }}
                          >
                            {deleting[pkg.id] ? '…' : '✕'}
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Modules Gating ── (cohort-wide; no scenario grouping) */
function ModulesGating({ assignments, cohorts, contentItems = [], onUnlocksChange }) {
  const [selected, setSelected] = useState(null);

  const linkedSlides = selected
    ? contentItems.filter((ci) => ci.linked_assignment_id === selected.id)
    : [];

  return (
    <div className="admin-layout">
      <div className="admin-left">
        {assignments.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
            No modules found.
          </p>
        )}
        {assignments.map((a) => (
          <button
            key={a.id}
            className={`admin-assign-btn${selected?.id === a.id ? ' active' : ''}`}
            onClick={() => setSelected(a)}
          >
            <span className="admin-assign-type" style={{ color: TYPE_COLOR.module }}>MODULE</span>
            <span className="admin-assign-title">{a.title}</span>
          </button>
        ))}
      </div>
      <div className="admin-right">
        {!selected ? (
          <div className="admin-empty">
            <p>Select a module to manage cohort access.</p>
          </div>
        ) : (
          <>
            <div className="admin-right-header">
              <div>
                <div className="admin-right-title">{selected.title}</div>
                <div className="admin-right-sub">Module · cohort-wide</div>
              </div>
            </div>
            <GatingPanel
              key={selected.id}
              assignment={selected}
              cohorts={cohorts}
              onUnlocksChange={(unlocks) => {
                setSelected((s) => ({ ...s, unlocks }));
                onUnlocksChange(selected.id, unlocks);
              }}
            />
            {linkedSlides.length > 0 && (
              <div style={{ padding: '0 20px 20px' }}>
                <div className="section-label" style={{ marginBottom: 8 }}>
                  Intel Library — Linked Slide Decks
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  These items auto-unlock with this module.
                </div>
                {linkedSlides.map((ci) => (
                  <div key={ci.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 10px', marginBottom: 4,
                    background: 'rgba(0,176,255,0.05)',
                    border: '1px solid rgba(0,176,255,0.15)',
                    borderRadius: 4,
                  }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      {CONTENT_TYPE_LABELS[ci.content_type] ?? ci.content_type}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--bright)', flex: 1 }}>{ci.title}</span>
                    <span style={{ fontSize: 10, color: ci.is_published ? '#10b981' : 'var(--muted)' }}>
                      {ci.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function scenarioLabel(name) {
  if (!name) return 'Unassigned';
  return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Challenges Gating ── (grouped by scenario_name) */
const KNOWN_SCENARIOS = [
  { value: 'packet-heist',  label: 'Packet Heist'  },
  { value: 'brokered-exit', label: 'Brokered Exit' },
  { value: 'left-on-red',   label: 'Left On Red'   },
];

function ChallengesGating({ assignments, cohorts, onUnlocksChange, onAssignmentsChange }) {
  const [selected,     setSelected]     = useState(null);
  const [closedGroups, setClosedGroups] = useState(new Set());
  const [localItems,   setLocalItems]   = useState(assignments);

  useEffect(() => { setLocalItems(assignments); }, [assignments]);

  // Two-level grouping: scenario → victim (null victim → '__no_victim__')
  // Top-level: scenario_name (null → '__unassigned__')
  const scenarioMap = new Map(); // scenarioKey → Map<victimKey, Assignment[]>
  for (const a of localItems) {
    const sKey = a.scenario_name ?? '__unassigned__';
    const vKey = a.victim_name   ?? '__no_victim__';
    if (!scenarioMap.has(sKey)) scenarioMap.set(sKey, new Map());
    const vMap = scenarioMap.get(sKey);
    if (!vMap.has(vKey)) vMap.set(vKey, []);
    vMap.get(vKey).push(a);
  }
  const scenarioGroups = [...scenarioMap.entries()].sort(([a], [b]) => {
    if (a === '__unassigned__') return 1;
    if (b === '__unassigned__') return -1;
    return a.localeCompare(b);
  });
  for (const [, vMap] of scenarioGroups) {
    for (const items of vMap.values()) items.sort((a, b) => a.order_index - b.order_index);
  }

  const toggleGroup = (key) =>
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const handleFieldChange = async (assignment, patch) => {
    try {
      await updateAssignment(assignment.id, patch);
      const updated = { ...assignment, ...patch };
      setLocalItems((prev) => prev.map((a) => a.id === assignment.id ? updated : a));
      setSelected((s) => s?.id === assignment.id ? updated : s);
      onAssignmentsChange?.((prev) => prev.map((a) => a.id === assignment.id ? updated : a));
    } catch { /* ignore */ }
  };

  return (
    <div className="admin-layout">
      <div className="admin-left">
        {localItems.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
            No challenges found.
          </p>
        )}
        {scenarioGroups.map(([sKey, vMap]) => {
          const sLabel   = scenarioLabel(sKey === '__unassigned__' ? null : sKey);
          const sCount   = [...vMap.values()].reduce((n, items) => n + items.length, 0);
          const sIsOpen  = !closedGroups.has(sKey);
          return (
            <div key={sKey}>
              <button className="admin-group-header" onClick={() => toggleGroup(sKey)}>
                <span className="admin-group-label">{sLabel}</span>
                <span className="admin-group-badge">{sCount}</span>
                <span className="admin-group-chevron">{sIsOpen ? '▲' : '▼'}</span>
              </button>
              {sIsOpen && [...vMap.entries()].sort(([a], [b]) => {
                if (a === '__no_victim__') return 1;
                if (b === '__no_victim__') return -1;
                return a.localeCompare(b);
              }).map(([vKey, items]) => {
                const vLabel  = vKey === '__no_victim__' ? 'Unassigned Victim' : vKey;
                const vGKey   = `${sKey}::${vKey}`;
                const vIsOpen = !closedGroups.has(vGKey);
                return (
                  <div key={vGKey}>
                    <button
                      className="admin-group-header"
                      style={{ paddingLeft: 24, background: 'transparent', fontSize: 10, color: 'var(--muted)', letterSpacing: '.12em' }}
                      onClick={() => toggleGroup(vGKey)}
                    >
                      <span style={{ flex: 1, textAlign: 'left' }}>{vLabel.toUpperCase()}</span>
                      <span className="admin-group-badge" style={{ fontSize: 9 }}>{items.length}</span>
                      <span className="admin-group-chevron" style={{ fontSize: 9 }}>{vIsOpen ? '▲' : '▼'}</span>
                    </button>
                    {vIsOpen && items.map((a) => (
                      <button
                        key={a.id}
                        className={`admin-assign-btn admin-assign-btn--nested${selected?.id === a.id ? ' active' : ''}`}
                        style={{ paddingLeft: 36 }}
                        onClick={() => setSelected(a)}
                      >
                        <span className="admin-assign-type" style={{ color: TYPE_COLOR.challenge }}>CHALLENGE</span>
                        <span className="admin-assign-title">{a.title}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className="admin-right">
        {!selected ? (
          <div className="admin-empty">
            <p>Select a challenge to manage cohort access.</p>
          </div>
        ) : (
          <>
            <div className="admin-right-header">
              <div>
                <div className="admin-right-title">{selected.title}</div>
                <div className="admin-right-sub">
                  Challenge
                  {selected.scenario_name && ` · ${scenarioLabel(selected.scenario_name)}`}
                  {selected.victim_name && ` · ${selected.victim_name}`}
                </div>
              </div>
            </div>

            {/* ── Scenario + Victim assignment ── */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)' }}>
                SCENARIO &amp; VICTIM
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', width: 56 }}>Scenario:</label>
                <select
                  value={selected.scenario_name ?? ''}
                  onChange={(e) => handleFieldChange(selected, { scenario_name: e.target.value || null })}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
                >
                  <option value="">— Unassigned —</option>
                  {KNOWN_SCENARIOS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', width: 56 }}>Victim:</label>
                <input
                  type="text"
                  value={selected.victim_name ?? ''}
                  onChange={(e) => handleFieldChange(selected, { victim_name: e.target.value || null })}
                  placeholder="e.g. Redstone Memorial Hospital"
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, flex: 1 }}
                />
              </div>
            </div>

            <GatingPanel
              key={selected.id}
              assignment={selected}
              cohorts={cohorts}
              onUnlocksChange={(unlocks) => {
                setSelected((s) => ({ ...s, unlocks }));
                onUnlocksChange(selected.id, unlocks);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function AssessmentSurveyGating({ assignments, cohorts, onUnlocksChange }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="admin-layout">
      <div className="admin-left">
        {assignments.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
            No assessments or surveys found.
          </p>
        )}
        {assignments.map((a) => {
          const color = TYPE_COLOR[a.type] ?? TYPE_COLOR.assessment;
          return (
            <button
              key={a.id}
              className={`admin-assign-btn${selected?.id === a.id ? ' active' : ''}`}
              onClick={() => setSelected(a)}
            >
              <span className="admin-assign-type" style={{ color }}>{a.type.toUpperCase()}</span>
              <span className="admin-assign-title">{a.title}</span>
            </button>
          );
        })}
      </div>
      <div className="admin-right">
        {!selected ? (
          <div className="admin-empty">
            <p>Select an assessment or survey to manage cohort access.</p>
          </div>
        ) : (
          <>
            <div className="admin-right-header">
              <div>
                <div className="admin-right-title">{selected.title}</div>
                <div className="admin-right-sub">{selected.type}</div>
              </div>
            </div>
            <GatingPanel
              key={selected.id}
              assignment={selected}
              cohorts={cohorts}
              onUnlocksChange={(unlocks) => {
                setSelected((s) => ({ ...s, unlocks }));
                onUnlocksChange(selected.id, unlocks);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function R2PublishBrowser({ rootPrefix, cohorts = [], onPublished, hideRelease = false }) {
  const [prefix,        setPrefix]        = useState(rootPrefix);
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [publishingKey, setPublishingKey] = useState(null);
  const [releasingKey,  setReleasingKey]  = useState(null);

  const load = useCallback((p) => {
    setLoading(true);
    setError('');
    setPublishingKey(null);
    setReleasingKey(null);
    browseScenarioR2(p)
      .then((d) => { setData(d); setPrefix(p); })
      .catch((e) => setError(e.response?.data?.error ?? 'Failed to load R2 contents.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(rootPrefix); }, [rootPrefix, load]);

  const crumbs = (() => {
    if (!prefix) return [{ label: 'root', prefix: '' }];
    const parts = prefix.split('/').filter(Boolean);
    return [{ label: 'root', prefix: '' }].concat(
      parts.map((p, i) => ({
        label:  p,
        prefix: parts.slice(0, i + 1).join('/') + '/',
      })),
    );
  })();

  return (
    <div className="r2-browser">
      <div className="r2-breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.prefix}>
            {i > 0 && <span className="r2-crumb-sep">/</span>}
            <button
              className={`r2-crumb${i === crumbs.length - 1 ? ' r2-crumb-active' : ''}`}
              onClick={() => load(c.prefix)}
              disabled={i === crumbs.length - 1}
            >{c.label}</button>
          </span>
        ))}
      </div>

      {error && <div className="err-msg" style={{ marginBottom: 8 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 16, textAlign: 'center' }}><div className="spinner" /></div>
      ) : data && (
        <div className="r2-listing">
          {data.folders.length === 0 && data.files.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Empty folder.</p>
          )}
          {data.folders.map((f) => (
            <div key={f.prefix} className="r2-file-block">
              <div className="r2-row r2-folder">
                <button className="r2-folder-nav" onClick={() => load(f.prefix)}>
                  <span className="r2-icon">📁</span>
                  <span className="r2-name">{f.name}/</span>
                </button>
                {!hideRelease && (
                  <button
                    className={`btn-sm-primary${releasingKey === f.prefix ? ' active' : ''}`}
                    style={{ marginLeft: 8, flexShrink: 0, fontSize: 11 }}
                    onClick={() => setReleasingKey(releasingKey === f.prefix ? null : f.prefix)}
                  >
                    {releasingKey === f.prefix ? 'Cancel' : '↓ Drop'}
                  </button>
                )}
              </div>
              {!hideRelease && releasingKey === f.prefix && (
                <FolderReleaseForm
                  folder={f}
                  cohorts={cohorts}
                  currentPrefix={prefix}
                  onReleased={() => { setReleasingKey(null); onPublished?.(); }}
                  onCancel={() => setReleasingKey(null)}
                />
              )}
            </div>
          ))}
          {data.files.map((f) => (
            <div key={f.key} className="r2-file-block">
              <div className="r2-row r2-file">
                <span className="r2-icon">📄</span>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="r2-name r2-file-link">{f.name}</a>
                {f.size != null && <span className="r2-size">{formatR2Size(f.size)}</span>}
                <button
                  className={`btn-sm-primary${publishingKey === f.key ? ' active' : ''}`}
                  style={{ marginLeft: 8, flexShrink: 0, fontSize: 11 }}
                  onClick={() => setPublishingKey(publishingKey === f.key ? null : f.key)}
                >
                  {publishingKey === f.key ? 'Cancel' : '↑ Publish'}
                </button>
              </div>
              {publishingKey === f.key && (
                <PublishFileForm
                  file={f}
                  onPublished={() => { setPublishingKey(null); onPublished?.(); }}
                  onCancel={() => setPublishingKey(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const DROP_SQUAD_PALETTE = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#8b5cf6' };

function FolderReleaseForm({ folder, cohorts = [], currentPrefix = '', onReleased, onCancel }) {
  // Infer drop number and scenario name from the current R2 path
  // Path shape: pact/scenarios/{scenario}/Drop {#}/{victim}/
  const inferDropNum = () => {
    const parts = (currentPrefix + folder.name).split('/').filter(Boolean);
    for (const p of parts) {
      const m = p.match(/^drop\s*(\d+)$/i);
      if (m) return m[1];
    }
    return '';
  };
  const inferScenario = () => {
    // Include folder.name so the scenario segment is captured even when releasing
    // the top-level scenario folder itself (currentPrefix ends at 'scenarios/').
    const parts = (currentPrefix + folder.name + '/').split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p.toLowerCase() === 'scenarios');
    return idx >= 0 ? (parts[idx + 1] ?? '') : '';
  };

  const defaultTitle = (() => {
    const sc  = inferScenario().replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const dn  = inferDropNum();
    return sc && dn ? `${sc} — Drop ${dn}` : folder.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  })();
  const [cohortId,     setCohortId]     = useState(() => cohorts[0]?.id ?? '');
  const [squads,       setSquads]       = useState([]);
  const [squadNum,     setSquadNum]     = useState('all');
  const [matchedSquad, setMatchedSquad] = useState(null); // { squad, score }
  const [title,        setTitle]        = useState(defaultTitle);
  const [description,  setDescription]  = useState('');
  const [releaseNum,   setReleaseNum]   = useState(inferDropNum);
  const [scenarioName, setScenarioName] = useState(inferScenario);
  const [cipher,       setCipher]       = useState('none');
  const [vaultHint,    setVaultHint]    = useState('');
  const [vaultPin,     setVaultPin]     = useState('');
  const [signalCode,   setSignalCode]   = useState('');
  const [signalPrompt, setSignalPrompt] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');
  const [done,         setDone]         = useState(false);

  // Load squads when cohort changes, then auto-match victim folder name
  useEffect(() => {
    if (!cohortId) { setSquads([]); setMatchedSquad(null); return; }
    getSquadsByCohort(cohortId)
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setSquads(arr);
        // Run victim name matching against squad case names
        let best = null, bestScore = 0.3;
        for (const sq of arr) {
          if (!sq.case_name) continue;
          const score = matchScore(folder.name, sq.case_name);
          if (score > bestScore) { bestScore = score; best = { squad: sq, score: bestScore }; }
        }
        if (best) {
          setMatchedSquad(best);
          setSquadNum(String(best.squad.number));
        } else {
          setMatchedSquad(null);
          setSquadNum('all');
        }
      })
      .catch(() => {});
  }, [cohortId, folder.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCohort = cohorts.find((c) => c.id === cohortId);

  const handleDrop = async () => {
    if (!cohortId) { setErr('Select a cohort.'); return; }
    if (!title.trim()) { setErr('Title is required.'); return; }
    if (!releaseNum) { setErr('Drop number is required to notify students.'); return; }
    if (cipher === 'vault' && (!vaultHint.trim() || !vaultPin.trim())) {
      setErr('Vault cipher requires both a hint and a PIN.'); return;
    }
    if (cipher === 'signal' && !signalCode.trim()) {
      setErr('Signal Hunt requires a signal code.'); return;
    }
    setSaving(true);
    setErr('');
    try {
      const dropNum = Number(releaseNum);

      // 1. Quick-release the scenario package to the cohort + optional squad
      await quickReleaseScenario({
        cohort_id:     cohortId,
        r2_key:        folder.prefix,
        title:         title.trim(),
        description:   description.trim() || undefined,
        scenario_name: scenarioName.trim() || folder.name,
        squad_number:  squadNum === 'all' ? null : Number(squadNum),
      });

      // 2. Always create/upsert the CampaignDrop record so the student gets the transmission
      let drops = [];
      try { drops = await getCampaignDrops(); } catch {}
      const existingDrop = (Array.isArray(drops) ? drops : []).find((d) => d.number === dropNum) ?? null;

      const dropPayload = {
        number: dropNum,
        title:  title.trim(),
        vault_hint:    cipher === 'vault'  ? vaultHint.trim()                || null : null,
        vault_pin:     cipher === 'vault'  ? vaultPin.trim()                 || null : null,
        html_signal:   cipher === 'signal' ? signalCode.trim().toUpperCase() || null : null,
        signal_prompt: cipher === 'signal' ? signalPrompt.trim()             || null : null,
      };

      let campaignDrop;
      if (existingDrop) {
        campaignDrop = await updateCampaignDrop(existingDrop.id, dropPayload);
        // updateCampaignDrop returns the updated record; keep existing id if response shape varies
        campaignDrop = campaignDrop?.id ? campaignDrop : existingDrop;
      } else {
        campaignDrop = await createCampaignDrop(dropPayload);
      }

      // 3. Unlock (release) the drop for the cohort — this is what makes is_unlocked: true
      await releaseCampaignDrop(campaignDrop.id, cohortId);

      setDone(true);
      setTimeout(onReleased, 1200);
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Drop failed');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div style={{ padding: '10px 16px', color: '#10b981', fontSize: 13, fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>
        DROP RELEASED{squadNum !== 'all' ? ` — SQUAD ${squadNum}` : ' — ALL SQUADS'}
        {cipher !== 'none' && ` + ${cipher === 'vault' ? 'VAULT LOCK' : 'SIGNAL HUNT'}`}
      </div>
    );
  }

  const squadColor = squadNum !== 'all' ? (DROP_SQUAD_PALETTE[Number(squadNum)] ?? 'var(--primary)') : 'var(--primary)';

  return (
    <div className="publish-form" style={{ borderLeft: `3px solid ${squadColor}` }}>
      {/* Scenario + path indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {scenarioName && (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: '.14em', padding: '2px 8px', borderRadius: 3,
            background: 'rgba(0,176,255,0.12)', color: 'var(--primary)',
            border: '1px solid rgba(0,176,255,0.3)', textTransform: 'uppercase',
          }}>
            {scenarioLabel(scenarioName)}
          </span>
        )}
        <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: '.06em' }}>
          {folder.prefix}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 10 }}>
        {/* Cohort */}
        <div className="form-field" style={{ margin: 0 }}>
          <label>Cohort *</label>
          <select value={cohortId} onChange={(e) => setCohortId(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, width: '100%' }}>
            <option value="">— select —</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Squad */}
        <div className="form-field" style={{ margin: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Squad
            {matchedSquad && squadNum === String(matchedSquad.squad.number) && (
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                letterSpacing: '.1em', padding: '1px 6px', borderRadius: 3,
                background: `${DROP_SQUAD_PALETTE[matchedSquad.squad.number] ?? '#94a3b8'}22`,
                color: DROP_SQUAD_PALETTE[matchedSquad.squad.number] ?? '#94a3b8',
                border: `1px solid ${DROP_SQUAD_PALETTE[matchedSquad.squad.number] ?? '#94a3b8'}44`,
              }}>
                AUTO-MATCHED · {matchedSquad.squad.case_name}
              </span>
            )}
          </label>
          <select value={squadNum} onChange={(e) => { setSquadNum(e.target.value); setMatchedSquad(null); }}
            style={{ padding: '5px 8px', borderRadius: 4, border: `1.5px solid ${squadColor}66`, background: 'var(--surface)', color: squadColor, fontSize: 13, fontWeight: 600, width: '100%' }}>
            <option value="all">All Squads</option>
            {squads.length > 0
              ? [...squads].sort((a, b) => a.number - b.number).map((sq) => (
                  <option key={sq.id} value={String(sq.number)}>
                    Squad {sq.number}{sq.case_name ? ` — ${sq.case_name}` : ''}
                  </option>
                ))
              : [1, 2, 3, 4].map((n) => <option key={n} value={String(n)}>Squad {n}</option>)
            }
          </select>
        </div>

        {/* Title */}
        <div className="form-field" style={{ margin: 0 }}>
          <label>Release title * <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>(shown to students)</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%' }} placeholder="e.g. Operation BRKR — Drop 1" />
        </div>

        {/* Drop # */}
        <div className="form-field" style={{ margin: 0 }}>
          <label>Drop # *</label>
          <input type="number" min={1} max={6} value={releaseNum} onChange={(e) => setReleaseNum(e.target.value)}
            placeholder="e.g. 1" style={{ width: '100%' }} />
        </div>
      </div>

      {/* Description */}
      <div className="form-field" style={{ margin: '0 0 10px' }}>
        <label>Description <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}>(optional — displayed below the release title)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Network traffic captures and server artefacts from the initial breach window."
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>

      {/* Cipher challenge */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--muted)', marginBottom: 8 }}>
          CIPHER CHALLENGE (OPTIONAL)
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[
            { key: 'none',   label: 'None' },
            { key: 'vault',  label: 'Vault Lock' },
            { key: 'signal', label: 'HTML Signal Hunt' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setCipher(key)} style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--mono)', fontWeight: 600, letterSpacing: '.06em',
              border: cipher === key
                ? `1.5px solid ${key === 'vault' ? 'var(--primary)' : key === 'signal' ? '#00ff9d' : 'var(--border)'}`
                : '1.5px solid var(--border)',
              background: cipher === key
                ? key === 'vault'  ? 'rgba(0,176,255,0.1)'
                : key === 'signal' ? 'rgba(0,255,157,0.08)'
                : 'var(--surface-2,#f1f5f9)'
                : 'var(--surface)',
              color: cipher === key
                ? key === 'vault' ? 'var(--primary)' : key === 'signal' ? '#00c978' : 'var(--text)'
                : 'var(--muted)',
            }}>
              {label}
            </button>
          ))}
        </div>

        {cipher === 'vault' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Cipher Challenge — hint shown to students</label>
              <textarea value={vaultHint} onChange={(e) => setVaultHint(e.target.value)} rows={2}
                placeholder="e.g. Run the SHA-256 hash of 'NIGHTFALL-7' through CyberChef. Enter the first 6 hex characters as the PIN."
                style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Vault PIN — the answer students must derive</label>
              <input value={vaultPin} onChange={(e) => setVaultPin(e.target.value.toUpperCase())}
                placeholder="e.g. A3F9B1" style={{ width: '100%', fontFamily: 'monospace', letterSpacing: '.1em' }} />
            </div>
          </div>
        )}

        {cipher === 'signal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Signal Code — embedded in page HTML source</label>
              <input value={signalCode} onChange={(e) => setSignalCode(e.target.value.toUpperCase())}
                placeholder="e.g. BRAVO-7-TANGO" style={{ width: '100%', fontFamily: 'monospace', letterSpacing: '.1em' }} />
            </div>
            <div className="form-field" style={{ margin: 0 }}>
              <label>Hunt Prompt — instruction shown to students</label>
              <textarea value={signalPrompt} onChange={(e) => setSignalPrompt(e.target.value)} rows={2}
                placeholder="A signal has been embedded in this operations channel. Inspect the page source to intercept it."
                style={{ width: '100%', resize: 'vertical' }} />
            </div>
          </div>
        )}
      </div>

      {err && <div className="err-msg" style={{ marginBottom: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-submit" style={{ width: 'auto' }} onClick={handleDrop} disabled={saving}>
          {saving ? 'Dropping…' : `Release Drop${squadNum !== 'all' ? ` → Squad ${squadNum}` : ' → All Squads'}`}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function guessContentType(filename) {
  const lower = filename.toLowerCase();
  const ext   = lower.split('.').pop();
  if (lower.includes('brief') || lower.includes('bulletin')) return 'briefing';
  if (lower.includes('eviden') || lower.includes('artifact') || lower.includes('log') || lower.includes('ioc')) return 'evidence';
  if (lower.includes('intel') || lower.includes('report') || lower.includes('analysis')) return 'intel_report';
  if (['pptx', 'ppt'].includes(ext)) return 'slides';
  if (['pdf', 'docx', 'doc'].includes(ext)) return 'handout';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'form';
  return 'resource';
}

function PublishFileForm({ file, onPublished, onCancel }) {
  const [title,       setTitle]       = useState(() => file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  const [contentType, setContentType] = useState(() => guessContentType(file.name));
  const [description, setDescription] = useState('');
  const [dropNumber,  setDropNumber]  = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');
  const [done,        setDone]        = useState(false);

  const handlePublish = async () => {
    if (!title.trim()) { setErr('Title is required'); return; }
    setSaving(true);
    setErr('');
    try {
      await createContentLink({
        title:        title.trim(),
        description:  description.trim() || undefined,
        content_type: contentType,
        url:          file.url,
        r2_key:       file.key,
        drop_number:  dropNumber ? Number(dropNumber) : undefined,
        is_published: isPublished,
      });
      setDone(true);
      setTimeout(onPublished, 1000);
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div style={{ padding: '8px 16px', color: '#10b981', fontSize: 13 }}>
        ✓ Added to Course Content
      </div>
    );
  }

  return (
    <div className="publish-form">
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--mono)' }}>
        {file.key}
      </div>
      <div className="form-field">
        <label>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-field" style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label>Type</label>
          <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
            {CONTENT_TYPES.map((t) => <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div style={{ flex: '0 0 90px' }}>
          <label>Drop #</label>
          <input
            type="number"
            min={1}
            max={6}
            placeholder="—"
            value={dropNumber}
            onChange={(e) => setDropNumber(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <input type="checkbox" id="pub-now" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        <label htmlFor="pub-now" style={{ fontSize: 13, cursor: 'pointer' }}>Publish now (visible when unlocked)</label>
      </div>
      <div className="form-field">
        <label>Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      </div>
      {err && <div className="err-msg">{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn-submit" style={{ width: 'auto' }} onClick={handlePublish} disabled={saving}>
          {saving ? 'Publishing…' : 'Add to Course Content'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function GatingPanel({ assignment, cohorts, onUnlocksChange }) {
  const [squadsByC,  setSquadsByC]  = useState({});   // cohortId → Squad[]
  const [loadingC,   setLoadingC]   = useState({});   // cohortId → bool
  const [busy,       setBusy]       = useState({});   // `${cohortId}:${squadId}` → bool
  const [errors,     setErrors]     = useState({});

  // Build sets from current unlock records for fast lookup
  const unlockedSquadIds = new Set(
    (assignment.unlocks ?? []).filter((u) => u.squad_id).map((u) => u.squad_id)
  );
  const unlockedCohortIds = new Set(
    (assignment.unlocks ?? []).filter((u) => !u.squad_id).map((u) => u.cohort_id)
  );

  // Eager-load squads for all cohorts on mount / when cohorts change
  useEffect(() => {
    cohorts.forEach(async (c) => {
      if (squadsByC[c.id] || loadingC[c.id]) return;
      setLoadingC((l) => ({ ...l, [c.id]: true }));
      try {
        const squads = await getSquadsByCohort(c.id);
        setSquadsByC((s) => ({ ...s, [c.id]: Array.isArray(squads) ? squads : (squads.data ?? []) }));
      } catch {}
      finally { setLoadingC((l) => ({ ...l, [c.id]: false })); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohorts]);

  const toggle = async (cohort, squad) => {
    const key       = `${cohort.id}:${squad.id}`;
    const unlocked  = unlockedSquadIds.has(squad.id);
    setBusy((b)   => ({ ...b, [key]: true }));
    setErrors((e) => ({ ...e, [key]: null }));
    try {
      if (unlocked) {
        await lockAssignment(assignment.id, cohort.id, squad.id);
        onUnlocksChange((assignment.unlocks ?? []).filter((u) => u.squad_id !== squad.id));
      } else {
        await unlockAssignment(assignment.id, cohort.id, squad.id);
        onUnlocksChange([...(assignment.unlocks ?? []), { cohort_id: cohort.id, squad_id: squad.id }]);
      }
    } catch (err) {
      setErrors((e) => ({ ...e, [key]: err.response?.data?.error?.message ?? 'Action failed' }));
    } finally {
      setBusy((b) => ({ ...b, [key]: false }));
    }
  };

  if (!cohorts.length) {
    return <div className="admin-empty"><p>No cohorts found for this course.</p></div>;
  }

  return (
    <div className="admin-gating">
      <p className="admin-gating-desc">
        Control which squads can access this assignment. Select individual squads across cohorts.
      </p>
      {cohorts.map((cohort) => {
        const squads = squadsByC[cohort.id] ?? [];
        const loading = loadingC[cohort.id];
        const cohortWide = unlockedCohortIds.has(cohort.id);
        return (
          <div key={cohort.id} className="admin-gating-cohort">
            <div className="admin-gating-cohort-header">
              {cohort.name}
              {cohortWide && <span className="admin-gating-badge badge-unlocked" style={{ marginLeft: 8, fontSize: 10 }}>All unlocked (legacy)</span>}
            </div>
            {loading ? (
              <div className="admin-gating-loading">Loading squads…</div>
            ) : squads.length === 0 ? (
              <div className="admin-gating-loading">No squads in this cohort.</div>
            ) : squads.map((squad) => {
              const key      = `${cohort.id}:${squad.id}`;
              const unlocked = cohortWide || unlockedSquadIds.has(squad.id);
              return (
                <div key={squad.id} className="admin-gating-row">
                  <div className="admin-gating-info">
                    <span className="admin-gating-name">
                      Squad {squad.number}{squad.name ? ` · ${squad.name}` : ''}
                    </span>
                    <span className={`admin-gating-badge ${unlocked ? 'badge-unlocked' : 'badge-locked'}`}>
                      {unlocked ? '🔓 Unlocked' : '🔒 Locked'}
                    </span>
                  </div>
                  {errors[key] && (
                    <div className="err-msg" style={{ fontSize: 11, padding: '4px 0' }}>{errors[key]}</div>
                  )}
                  <button
                    className={`admin-gate-btn ${unlocked ? 'gate-lock' : 'gate-unlock'}`}
                    onClick={() => toggle(cohort, squad)}
                    disabled={busy[key] || cohortWide}
                    title={cohortWide ? 'Cohort-wide unlock in effect' : undefined}
                  >
                    {busy[key] ? '…' : unlocked ? 'Lock' : 'Unlock'}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
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
            {sub.squad && ` · Squad ${sub.squad.number}${sub.squad.name ? ` (${sub.squad.name})` : ''}`}
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
          squadId={sub.squad_id}
          isSquad={assignment.grading_mode === 'squad'}
          maxScore={parseFloat(assignment.max_score ?? 100)}
          existingGrade={savedGrade}
          onSaved={handleSaved}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAMPAIGN DROPS PANEL
═══════════════════════════════════════════════════════════ */

const VICTIM_NAMES = { 1: 'Redstone Memorial Hospital', 2: 'Dogwood Hotel', 3: 'CyberDyne Data Center', 4: 'Pixel Play Arcade' };
const VICTIM_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#8b5cf6' };

function DropFormInline({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    number:          initial?.number          ?? '',
    title:           initial?.title           ?? '',
    narrative_intro: initial?.narrative_intro ?? '',
    vault_hint:      initial?.vault_hint      ?? '',
    vault_pin:       initial?.vault_pin       ?? '',
    html_signal:     initial?.html_signal     ?? '',
    signal_prompt:   initial?.signal_prompt   ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.number || !form.title.trim()) { setErr('Drop number and title are required.'); return; }
    setSaving(true);
    setErr('');
    try {
      const payload = { ...form, number: Number(form.number) };
      if (initial) await updateCampaignDrop(initial.id, payload);
      else         await createCampaignDrop(payload);
      onSave();
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="publish-form" style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: '0 0 80px' }}>
          <label className="admin-grade-label">Drop #</label>
          <input
            type="number" min={1} max={6}
            value={form.number}
            onChange={set('number')}
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="admin-grade-label">Title *</label>
          <input
            value={form.title}
            onChange={set('title')}
            placeholder="e.g. Initial Breach"
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <label className="admin-grade-label">Command Post Bulletin (shown to students when released)</label>
        <textarea
          value={form.narrative_intro}
          onChange={set('narrative_intro')}
          rows={4}
          placeholder="Intel brief, narrative context, tasking orders…"
          style={{ width: '100%', resize: 'vertical' }}
        />
      </div>
      <div style={{ background: 'rgba(0,176,255,0.04)', border: '1px solid rgba(0,176,255,0.15)', borderRadius: 4, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '.18em', color: 'rgba(0,176,255,0.7)', textTransform: 'uppercase', marginBottom: 8 }}>
          Vault Lock (optional)
        </div>
        <div style={{ marginBottom: 8 }}>
          <label className="admin-grade-label">Cipher Challenge — Vault Hint (shown to students)</label>
          <textarea
            value={form.vault_hint}
            onChange={set('vault_hint')}
            rows={2}
            placeholder="e.g. Run the SHA-256 hash of 'NIGHTFALL-7' through CyberChef. Enter the first 6 hex characters as the PIN."
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
        <div>
          <label className="admin-grade-label">Vault PIN (secret — students must derive this)</label>
          <input
            value={form.vault_pin}
            onChange={set('vault_pin')}
            placeholder="e.g. A3F9B1"
            style={{ width: '100%', fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}
          />
        </div>
      </div>
      <div style={{ background: 'rgba(0,255,157,0.03)', border: '1px solid rgba(0,255,157,0.15)', borderRadius: 4, padding: '10px 12px', marginBottom: 8 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '.18em', color: 'rgba(0,255,157,0.65)', textTransform: 'uppercase', marginBottom: 8 }}>
          HTML Signal Hunt (optional)
        </div>
        <div style={{ marginBottom: 8 }}>
          <label className="admin-grade-label">Signal Code (embedded in page &lt;head&gt; as a hidden HTML comment)</label>
          <input
            value={form.html_signal}
            onChange={set('html_signal')}
            placeholder="e.g. BRAVO-7-TANGO"
            style={{ width: '100%', fontFamily: 'monospace', letterSpacing: '.1em', textTransform: 'uppercase' }}
          />
        </div>
        <div>
          <label className="admin-grade-label">Hunt Prompt (shown to students — what to look for)</label>
          <textarea
            value={form.signal_prompt}
            onChange={set('signal_prompt')}
            rows={2}
            placeholder="A signal has been embedded in this operations channel. Inspect the page source to intercept it."
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>
      </div>
      {err && <div className="err-msg">{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn-submit" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Update Drop' : 'Create Drop'}
        </button>
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Scenario Intel Panel ─────────────────────────────────────────────────── */
const DROP_SQUAD_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#8b5cf6' };
const EXT_ICONS = {
  pdf:  { icon: 'PDF', color: '#ef4444' },
  docx: { icon: 'DOC', color: '#3b82f6' },
  doc:  { icon: 'DOC', color: '#3b82f6' },
  xlsx: { icon: 'XLS', color: '#10b981' },
  xls:  { icon: 'XLS', color: '#10b981' },
  zip:  { icon: 'ZIP', color: '#f59e0b' },
  pcap: { icon: 'CAP', color: '#8b5cf6' },
  img:  { icon: 'IMG', color: '#06b6d4' },
  png:  { icon: 'PNG', color: '#06b6d4' },
  jpg:  { icon: 'IMG', color: '#06b6d4' },
  jpeg: { icon: 'IMG', color: '#06b6d4' },
  txt:  { icon: 'TXT', color: '#94a3b8' },
  csv:  { icon: 'CSV', color: '#10b981' },
  json: { icon: 'JSON', color: '#f59e0b' },
};

function fileExt(name) {
  return name.split('.').pop()?.toLowerCase() ?? '';
}
function extTag(name) {
  const ext = fileExt(name);
  return EXT_ICONS[ext] ?? { icon: ext.toUpperCase().slice(0, 3) || 'FILE', color: '#64748b' };
}
function formatBytes(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}


function ScenarioIntelPanel({ scenarios, dropNumber }) {
  const matched = scenarios.filter((s) => s.release_number === dropNumber);
  const [expanded,    setExpanded]   = useState({});  // pkgId → bool
  const [r2Files,     setR2Files]    = useState({});  // pkgId → file[]
  const [r2Loading,   setR2Loading]  = useState({});  // pkgId → bool
  const [r2Err,       setR2Err]      = useState({});  // pkgId → string

  const loadFiles = async (pkg) => {
    if (r2Files[pkg.id] || r2Loading[pkg.id]) {
      setExpanded((e) => ({ ...e, [pkg.id]: !e[pkg.id] }));
      return;
    }
    setR2Loading((l) => ({ ...l, [pkg.id]: true }));
    setExpanded((e) => ({ ...e, [pkg.id]: true }));
    try {
      // Structure: pact/scenarios/{name}/Drop {#}/{Victim}/files
      // The pkg.r2_key may point to the scenario root, a drop folder, or a victim folder.
      // We do a two-level browse: top + one level deep into each sub-folder.
      const top = await browseScenarioR2(pkg.r2_key);
      const topFolders = top.folders ?? [];

      // Browse one level into each sub-folder in parallel
      const subResults = await Promise.all(
        topFolders.map((f) => browseScenarioR2(f.prefix).catch(() => ({ folders: [], files: [] })))
      );

      // Build display rows: { label, isFolder, children?, files? }
      const rows = [];

      // Top-level files (supplemental files at this level)
      for (const f of (top.files ?? [])) {
        rows.push({ type: 'file', name: f.name, size: f.size, url: f.url, folder: null });
      }

      for (let i = 0; i < topFolders.length; i++) {
        const folderName = topFolders[i].name;
        const sub        = subResults[i];

        // Files directly inside this folder
        for (const f of (sub.files ?? [])) {
          rows.push({ type: 'file', name: f.name, size: f.size, url: f.url, folder: folderName });
        }
        // Sub-folders (next level — victim folders or further nesting)
        for (const sf of (sub.folders ?? [])) {
          rows.push({ type: 'folder', name: sf.name, folder: folderName, prefix: sf.prefix });
        }
        // If sub had nothing, still show the folder so the structure is visible
        if ((sub.files ?? []).length === 0 && (sub.folders ?? []).length === 0) {
          rows.push({ type: 'empty-folder', name: folderName, folder: null });
        }
      }

      setR2Files((rf) => ({ ...rf, [pkg.id]: rows }));
    } catch {
      setR2Err((e) => ({ ...e, [pkg.id]: 'Failed to load R2 contents' }));
    } finally {
      setR2Loading((l) => ({ ...l, [pkg.id]: false }));
    }
  };

  if (matched.length === 0) return null;

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'rgba(0,176,255,0.02)',
      padding: '10px 14px',
    }}>
      <div style={{
        fontFamily: 'monospace', fontSize: 10, letterSpacing: '.14em',
        color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        SCENARIO INTEL — {matched.length} PACKAGE{matched.length !== 1 ? 'S' : ''} LINKED
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {matched.map((pkg) => {
          const squadColor = pkg.squad_number ? (DROP_SQUAD_COLORS[pkg.squad_number] ?? '#94a3b8') : null;
          const isExpanded = !!expanded[pkg.id];
          const files = r2Files[pkg.id] ?? [];

          return (
            <div key={pkg.id} style={{
              border: '1px solid var(--border)',
              borderRadius: 6,
              overflow: 'hidden',
              background: 'var(--surface, #fff)',
            }}>
              {/* Package header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', cursor: 'pointer',
              }} onClick={() => loadFiles(pkg)}>
                {squadColor && (
                  <span style={{
                    fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
                    letterSpacing: '.1em', padding: '1px 6px', borderRadius: 3,
                    background: squadColor + '22', color: squadColor,
                    border: `1px solid ${squadColor}44`, flexShrink: 0,
                  }}>
                    SQ {pkg.squad_number}
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                    {pkg.title}
                  </div>
                  {pkg.scenario_name && pkg.scenario_name !== pkg.title && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', letterSpacing: '.04em' }}>
                      {pkg.scenario_name}
                    </div>
                  )}
                  {pkg.description && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 }}>
                      {pkg.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  {pkg.is_published && (
                    <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>PUBLISHED</span>
                  )}
                  <span style={{
                    fontFamily: 'monospace', fontSize: 10, color: 'var(--muted)',
                    letterSpacing: '.08em',
                  }}>
                    {pkg.r2_key.replace(/^scenarios\//, '').replace(/\/$/, '')}
                  </span>
                  {r2Loading[pkg.id] ? (
                    <div className="spinner" style={{ width: 12, height: 12 }} />
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ color: 'var(--muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                </div>
              </div>

              {/* R2 file tree */}
              {isExpanded && !r2Loading[pkg.id] && (
                <div style={{
                  borderTop: '1px solid var(--border)',
                  background: 'var(--surface-2, #f8fafc)',
                  padding: '8px 12px',
                  fontSize: 12,
                }}>
                  {r2Err[pkg.id] ? (
                    <div style={{ color: 'var(--danger)', fontSize: 12 }}>{r2Err[pkg.id]}</div>
                  ) : files.length === 0 ? (
                    <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No files found in R2</div>
                  ) : (() => {
                    // Group rows by their parent folder label
                    const byParent = {};  // parentFolder → row[]
                    const rootRows = [];
                    for (const row of files) {
                      if (row.folder) {
                        if (!byParent[row.folder]) byParent[row.folder] = [];
                        byParent[row.folder].push(row);
                      } else {
                        rootRows.push(row);
                      }
                    }
                    const parentFolders = Object.keys(byParent);

                    const FileRow = ({ row, indent = 0 }) => {
                      const tag = extTag(row.name);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: indent }}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: 8, fontWeight: 700,
                            padding: '1px 4px', borderRadius: 2,
                            background: tag.color + '22', color: tag.color, flexShrink: 0,
                          }}>{tag.icon}</span>
                          <span style={{ color: 'var(--text)', fontSize: 12, flex: 1 }}>{row.name}</span>
                          {row.size > 0 && (
                            <span style={{ color: 'var(--muted)', fontSize: 10, flexShrink: 0 }}>{formatBytes(row.size)}</span>
                          )}
                        </div>
                      );
                    };

                    const FolderLabel = ({ name, count, color }) => (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontFamily: 'monospace', fontWeight: 700, fontSize: 11,
                        letterSpacing: '.05em', color: color ?? 'var(--text)', marginBottom: 3,
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        {name}
                        {count > 0 && (
                          <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 10 }}>
                            ({count})
                          </span>
                        )}
                      </div>
                    );

                    const dropLike   = (n) => /^drop\s*\d+$/i.test(n);
                    const victimLike = (n) => !/^drop\s*\d+$/i.test(n);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {/* Grouped by parent folder */}
                        {parentFolders.map((parentName) => {
                          const rows    = byParent[parentName];
                          const isDropFolder   = dropLike(parentName);
                          const parentColor    = isDropFolder ? 'var(--primary)' : '#f59e0b';
                          const fileRows       = rows.filter((r) => r.type === 'file');
                          const subFolderRows  = rows.filter((r) => r.type === 'folder');
                          return (
                            <div key={parentName}>
                              <FolderLabel
                                name={parentName}
                                count={fileRows.length + subFolderRows.length}
                                color={parentColor}
                              />
                              <div style={{ paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {/* Sub-folders (victim folders inside a drop folder) */}
                                {subFolderRows.map((sf, i) => (
                                  <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    fontFamily: 'monospace', fontSize: 11,
                                    color: '#f59e0b', fontWeight: 600,
                                  }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
                                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    {sf.name}
                                  </div>
                                ))}
                                {/* Files inside this folder */}
                                {fileRows.map((row, i) => <FileRow key={i} row={row} />)}
                              </div>
                            </div>
                          );
                        })}
                        {/* Root-level rows (files or empty-folder markers) */}
                        {rootRows.map((row, i) =>
                          row.type === 'file'
                            ? <FileRow key={i} row={row} />
                            : row.type === 'empty-folder'
                              ? <FolderLabel key={i} name={row.name} count={0} />
                              : null
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CampaignDropsPanel({ cohorts }) {
  const [drops,     setDrops]    = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [cohortId,  setCohortId] = useState(() => cohorts[0]?.id ?? '');
  const [addOpen,   setAddOpen]  = useState(false);
  const [editDrop,  setEditDrop] = useState(null);
  const [delDrop,   setDelDrop]  = useState(null);
  const [working,   setWorking]  = useState(null);
  const [err,       setErr]      = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    Promise.all([
      getCampaignDrops(cohortId || undefined),
      scenarios.length === 0 ? getScenarios() : Promise.resolve(scenarios),
    ])
      .then(([d, s]) => {
        setDrops(Array.isArray(d) ? d : []);
        setScenarios(Array.isArray(s) ? s : (s?.data ?? []));
      })
      .catch(() => setErr('Failed to load campaign drops.'))
      .finally(() => setLoading(false));
  }, [cohortId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleRelease = async (drop) => {
    if (!cohortId) { setErr('Select a cohort first.'); return; }
    setWorking(drop.id + ':release');
    setErr('');
    try { await releaseCampaignDrop(drop.id, cohortId); load(); }
    catch (e) { setErr(e.response?.data?.error?.message ?? 'Release failed'); }
    finally { setWorking(null); }
  };

  const handleLock = async (drop) => {
    if (!cohortId) { setErr('Select a cohort first.'); return; }
    setWorking(drop.id + ':lock');
    setErr('');
    try { await lockCampaignDrop(drop.id, cohortId); load(); }
    catch (e) { setErr(e.response?.data?.error?.message ?? 'Lock failed'); }
    finally { setWorking(null); }
  };

  const handleDelete = async (drop) => {
    setWorking(drop.id + ':delete');
    try { await deleteCampaignDrop(drop.id); setDelDrop(null); load(); }
    catch (e) { setErr(e.response?.data?.error?.message ?? 'Delete failed'); }
    finally { setWorking(null); }
  };

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', color: 'var(--primary)', marginBottom: 4 }}>
            OPERATION BRKR — DROP CONTROL
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            Create drops, write Command Post bulletins, and release to cohorts. Files tagged with a drop number unlock automatically when the drop is released.
          </p>
        </div>
        <button
          className="btn-submit"
          style={{ width: 'auto', flexShrink: 0 }}
          onClick={() => { setAddOpen((v) => !v); setEditDrop(null); }}
        >
          {addOpen ? 'Cancel' : '+ New Drop'}
        </button>
      </div>

      {addOpen && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--surface-2, #f8fafc)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>NEW DROP</div>
          <DropFormInline
            onSave={() => { setAddOpen(false); load(); }}
            onCancel={() => setAddOpen(false)}
          />
        </div>
      )}

      {/* Cohort selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: 'var(--surface-2, #f8fafc)', borderRadius: 8, border: '1px solid var(--border)' }}>
        <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>Release to:</span>
        {cohorts.length === 0 ? (
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>No cohorts found</span>
        ) : (
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'white' }}
          >
            <option value="">— pick cohort —</option>
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <button
          className="btn-secondary"
          style={{ fontSize: 12, padding: '4px 10px', flexShrink: 0 }}
          onClick={load}
          disabled={loading}
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      {err && <div className="err-msg" style={{ marginBottom: 10 }}>{err}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" /></div>
      ) : drops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 13 }}>
          No drops yet. Create the first one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...drops].sort((a, b) => a.number - b.number).map((drop) => {
            const isUnlocked = drop.is_unlocked;
            const isWorking  = !!working?.startsWith(drop.id);
            const isEditing  = editDrop?.id === drop.id;
            return (
              <div
                key={drop.id}
                style={{
                  border: `1px solid ${isUnlocked ? 'var(--primary)' : 'var(--border)'}`,
                  borderLeft: `4px solid ${isUnlocked ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'var(--surface, #fff)',
                }}
              >
                {/* Drop header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                    background: isUnlocked ? 'var(--primary)' : 'var(--surface-2, #f1f5f9)',
                    color:      isUnlocked ? '#fff' : 'var(--muted)',
                  }}>
                    DROP {drop.number}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{drop.title}</span>
                  {isUnlocked && cohortId && (
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, flexShrink: 0 }}>● RELEASED</span>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {cohortId && (
                      isUnlocked ? (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 12, padding: '4px 12px' }}
                          disabled={isWorking}
                          onClick={() => handleLock(drop)}
                        >
                          {working === drop.id + ':lock' ? '…' : 'Lock'}
                        </button>
                      ) : (
                        <button
                          className="btn-submit"
                          style={{ fontSize: 12, padding: '4px 12px', width: 'auto' }}
                          disabled={isWorking}
                          onClick={() => handleRelease(drop)}
                        >
                          {working === drop.id + ':release' ? '…' : 'Release'}
                        </button>
                      )
                    )}
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 12, padding: '4px 10px' }}
                      onClick={() => setEditDrop(isEditing ? null : drop)}
                    >
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, lineHeight: 1, padding: '4px 6px' }}
                      disabled={isWorking}
                      onClick={() => setDelDrop(drop)}
                      title="Delete drop"
                    >✕</button>
                  </div>
                </div>

                {/* Bulletin preview */}
                {drop.narrative_intro && !isEditing && (
                  <div style={{
                    padding: '8px 14px 10px',
                    borderTop: '1px solid var(--border)',
                    fontSize: 12, color: 'var(--muted)', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    maxHeight: 80, overflow: 'hidden',
                    background: isUnlocked ? 'rgba(var(--primary-rgb, 0,176,255), 0.04)' : undefined,
                  }}>
                    {drop.narrative_intro}
                  </div>
                )}

                {/* Game locks badge strip */}
                {!isEditing && (drop.vault_hint || drop.html_signal) && (
                  <div style={{
                    padding: '5px 14px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex', gap: 6, flexWrap: 'wrap',
                  }}>
                    {drop.html_signal && (
                      <span style={{
                        fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
                        letterSpacing: '.14em', padding: '2px 8px', borderRadius: 3,
                        background: 'rgba(0,255,157,0.1)', color: '#00c978',
                        border: '1px solid rgba(0,255,157,0.25)',
                      }}>
                        HTML SIGNAL
                      </span>
                    )}
                    {drop.vault_hint && (
                      <span style={{
                        fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
                        letterSpacing: '.14em', padding: '2px 8px', borderRadius: 3,
                        background: 'rgba(0,176,255,0.1)', color: 'var(--primary)',
                        border: '1px solid rgba(0,176,255,0.25)',
                      }}>
                        VAULT LOCK
                      </span>
                    )}
                  </div>
                )}

                {/* Scenario intel — linked R2 packages */}
                {!isEditing && (
                  <ScenarioIntelPanel scenarios={scenarios} dropNumber={drop.number} />
                )}

                {/* Inline edit form */}
                {isEditing && (
                  <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                    <DropFormInline
                      initial={drop}
                      onSave={() => { setEditDrop(null); load(); }}
                      onCancel={() => setEditDrop(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {delDrop && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 380, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Delete Drop {delDrop.number}?</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              "{delDrop.title}" will be removed. Files tagged to this drop won't be deleted, but they'll no longer auto-release with it.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setDelDrop(null)}>Cancel</button>
              <button
                className="btn-submit"
                style={{ width: 'auto', background: 'var(--danger, #ef4444)' }}
                disabled={!!working}
                onClick={() => handleDelete(delDrop)}
              >
                {working ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COURSE CONTENT PANEL
═══════════════════════════════════════════════════════════ */

const CONTENT_TYPES = ['briefing', 'evidence', 'intel_report', 'slides', 'handout', 'agenda', 'form', 'resource'];
const CONTENT_TYPE_LABELS = {
  briefing:     'CP Briefing',
  evidence:     'Evidence',
  intel_report: 'Intel Report',
  slides:       'Slides',
  handout:      'Handout',
  agenda:       'Agenda',
  form:         'Form',
  resource:     'Resource',
};

function CourseContentPanel({ items, cohorts, loaded, onItemsChange, assignments = [] }) {
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const moduleAssignments = assignments.filter((a) => a.type === 'module');

  if (!loaded) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="admin-layout">
      <div className="admin-left">
        <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="section-label">Content Items</span>
          <button className="btn-sm-primary" onClick={() => { setShowForm(true); setSelected(null); }}>+ Add</button>
        </div>
        <div className="admin-assignment-list">
          {items.length === 0 && <div className="empty-state" style={{ padding: '24px 16px' }}>No content yet.</div>}
          {items.map((item) => (
            <div
              key={item.id}
              className={`admin-assignment-row${selected?.id === item.id ? ' selected' : ''}`}
              onClick={() => { setSelected(item); setShowForm(false); }}
            >
              <div className="admin-a-title">{item.title}</div>
              <div className="admin-a-meta">
                <span className="type-badge" style={{ fontSize: 9, padding: '2px 6px' }}>{CONTENT_TYPE_LABELS[item.content_type]}</span>
                {item.is_published
                  ? <span style={{ fontSize: 10, color: '#10b981' }}>Published</span>
                  : <span style={{ fontSize: 10, color: '#94a3b8' }}>Draft</span>}
              </div>
            </div>
          ))}
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
            moduleAssignments={moduleAssignments}
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

/* ═══════════════════════════════════════════════════════════
   CASE FILE PANEL — cohort setup + drop release workflow
═══════════════════════════════════════════════════════════ */

const SQUAD_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#8b5cf6' };

function normalizeName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchScore(folderName, caseName) {
  const folderWords = new Set(normalizeName(folderName).split(' ').filter(Boolean));
  const caseWords   = normalizeName(caseName).split(' ').filter(Boolean);
  if (!folderWords.size || !caseWords.length) return 0;
  const hits = caseWords.filter((w) => folderWords.has(w)).length;
  return hits / Math.max(folderWords.size, caseWords.length);
}

function detectSquad(name, squads) {
  let best = null, bestScore = 0.3;
  for (const sq of squads) {
    if (!sq.case_name) continue;
    const score = matchScore(name, sq.case_name);
    if (score > bestScore) { bestScore = score; best = sq; }
  }
  return best;
}

function SquadChip({ squad }) {
  if (!squad) {
    return (
      <span style={{
        padding: '2px 7px', borderRadius: 4, fontSize: 10,
        fontFamily: 'var(--mono)', fontWeight: 700, flexShrink: 0,
        background: 'var(--surface-2, #f1f5f9)', color: 'var(--muted)',
        border: '1px solid var(--border)',
      }}>
        ALL SQUADS
      </span>
    );
  }
  const color = SQUAD_COLORS[squad.number] ?? 'var(--primary)';
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 4, fontSize: 10,
      fontFamily: 'var(--mono)', fontWeight: 700, flexShrink: 0,
      background: `${color}22`, color, border: `1px solid ${color}44`,
    }}>
      SQUAD {squad.number}
    </span>
  );
}

function CaseFilePanel({ cohorts, onCohortsChange }) {
  const [cohortId, setCohortId] = useState(() => cohorts[0]?.id ?? '');
  const [subTab,   setSubTab]   = useState('setup');

  const selectedCohort = cohorts.find((c) => c.id === cohortId) ?? null;

  const handleCohortUpdate = useCallback((updated) => {
    onCohortsChange((prev) => prev.map((c) => c.id === updated.id ? { ...c, ...updated } : c));
  }, [onCohortsChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
        background: 'var(--surface)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Cohort</span>
          <select
            value={cohortId}
            onChange={(e) => setCohortId(e.target.value)}
            style={{ padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'var(--surface)', color: 'var(--text)' }}
          >
            {cohorts.length === 0 && <option value="">No cohorts</option>}
            {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['setup', 'releases'].map((tab) => (
            <button
              key={tab}
              className={`scenario-tab${subTab === tab ? ' active' : ''}`}
              onClick={() => setSubTab(tab)}
            >
              {tab === 'setup' ? 'Cohort Setup' : 'Release Drops'}
            </button>
          ))}
        </div>
      </div>

      {!selectedCohort ? (
        <div className="admin-empty"><p>No cohorts available.</p></div>
      ) : subTab === 'setup' ? (
        <CohortSetupPanel
          key={selectedCohort.id}
          cohort={selectedCohort}
          onCohortUpdate={handleCohortUpdate}
        />
      ) : (
        <DropReleasePanel
          key={selectedCohort.id}
          cohort={selectedCohort}
        />
      )}
    </div>
  );
}

function CohortSetupPanel({ cohort, onCohortUpdate }) {
  const [squads,          setSquads]          = useState([]);
  const [loadingSquads,   setLoadingSquads]   = useState(true);
  const [scenarioName,    setScenarioName]    = useState(cohort.scenario_name ?? '');
  const [savingScenario,  setSavingScenario]  = useState(false);
  const [caseNames,       setCaseNames]       = useState({});
  const [savingSquad,     setSavingSquad]     = useState({});
  const [targetBusy,      setTargetBusy]      = useState(false);
  const [err,             setErr]             = useState('');
  const [msg,             setMsg]             = useState('');

  // R2 detection state
  const [r2Scenarios,     setR2Scenarios]     = useState([]);  // {name, prefix}[]
  const [scanningR2,      setScanningR2]      = useState(false);
  const [r2Victims,       setR2Victims]       = useState([]);  // folder name strings
  const [scanningVictims, setScanningVictims] = useState(false);
  const [victimPickerSq,  setVictimPickerSq]  = useState(null); // squadId being picked

  useEffect(() => {
    setLoadingSquads(true);
    getSquadsByCohort(cohort.id)
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setSquads(arr);
        const init = {};
        arr.forEach((sq) => { init[sq.id] = sq.case_name ?? ''; });
        setCaseNames(init);
      })
      .catch(() => {})
      .finally(() => setLoadingSquads(false));
  }, [cohort.id]);

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };

  const saveScenario = async (nameOverride) => {
    const name = (nameOverride ?? scenarioName).trim();
    setSavingScenario(true);
    setErr('');
    try {
      const updated = await updateCohort(cohort.id, { scenario_name: name || null });
      onCohortUpdate(updated);
      if (nameOverride !== undefined) setScenarioName(name);
      flash('Scenario saved.');
    } catch { setErr('Save failed.'); }
    finally { setSavingScenario(false); }
  };

  const saveCaseName = async (squadId, nameOverride) => {
    const name = nameOverride ?? caseNames[squadId];
    if (nameOverride !== undefined) setCaseNames((p) => ({ ...p, [squadId]: nameOverride }));
    setSavingSquad((s) => ({ ...s, [squadId]: true }));
    setVictimPickerSq(null);
    try {
      await updateSquad(cohort.id, squadId, { case_name: (name ?? '').trim() || null });
      setSquads((prev) => prev.map((sq) => sq.id === squadId ? { ...sq, case_name: (name ?? '').trim() || null } : sq));
      flash('Case name saved.');
    } catch { setErr('Save failed.'); }
    finally { setSavingSquad((s) => ({ ...s, [squadId]: false })); }
  };

  // Browse pact/scenarios/ to find available scenario folders
  const scanScenarios = async () => {
    setScanningR2(true);
    setR2Scenarios([]);
    try {
      const data = await browseScenarioR2('pact/scenarios/');
      const folders = (data.folders ?? []).map((f) => ({
        name:   f.name,
        prefix: f.prefix,
      }));
      setR2Scenarios(folders);
    } catch { setErr('Failed to scan R2. Check credentials.'); }
    finally { setScanningR2(false); }
  };

  // Browse pact/scenarios/{scenarioName}/Drop {#}/ to find victim sub-folders
  // Structure: pact/scenarios/{name}/Drop {#}/{Victim Name}/ + supplemental files
  const scanVictims = async () => {
    const name = scenarioName.trim();
    if (!name) { setErr('Set a scenario name first.'); return; }
    setScanningVictims(true);
    setR2Victims([]);
    try {
      const scenarioPrefix = `pact/scenarios/${name}/`;
      const topLevel = await browseScenarioR2(scenarioPrefix);

      // Top-level folders are Drop folders: "Drop 1", "Drop 2", etc.
      const dropFolders = topLevel.folders ?? [];

      // Browse every drop folder in parallel to get victim sub-folders + supplemental files
      const dropContents = await Promise.all(
        dropFolders.map((df) =>
          browseScenarioR2(df.prefix).catch(() => ({ folders: [], files: [] }))
        )
      );

      // Collect unique victim names across all drops, tracking which drops they appear in
      const victimMap = new Map(); // victim name → { drops: Set<dropName>, prefix }
      for (let i = 0; i < dropFolders.length; i++) {
        const dropName   = dropFolders[i].name;     // e.g. "Drop 1"
        const dropNum    = parseInt(dropName.replace(/\D/g, ''), 10) || (i + 1);
        const contents   = dropContents[i];

        for (const victim of (contents.folders ?? [])) {
          if (!victimMap.has(victim.name)) {
            victimMap.set(victim.name, { drops: new Set(), dropNums: new Set(), prefix: victim.prefix });
          }
          victimMap.get(victim.name).drops.add(dropName);
          victimMap.get(victim.name).dropNums.add(dropNum);
        }
      }

      const victims = Array.from(victimMap.entries()).map(([victimName, info]) => ({
        name:     victimName,
        drops:    Array.from(info.drops).sort(),
        dropNums: Array.from(info.dropNums).sort((a, b) => a - b),
        prefix:   info.prefix,
        squadHint: null,
      }));

      setR2Victims(victims);
    } catch { setErr('Failed to scan victim folders.'); }
    finally { setScanningVictims(false); }
  };

  const toggleTarget = async () => {
    setTargetBusy(true);
    setErr('');
    try {
      const updated = await updateCohort(cohort.id, { target_revealed: !cohort.target_revealed });
      onCohortUpdate(updated);
    } catch { setErr('Update failed.'); }
    finally { setTargetBusy(false); }
  };

  const revealed = !!cohort.target_revealed;

  return (
    <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, maxWidth: 720 }}>
      {err && <div className="err-msg" style={{ marginBottom: 12 }}>{err}</div>}
      {msg && <div style={{ fontSize: 12, color: '#10b981', marginBottom: 12, fontFamily: 'var(--mono)', letterSpacing: '.08em' }}>{msg}</div>}

      {/* ── Scenario Assignment ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
          Scenario Assignment
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Must match the R2 folder name exactly. Click <strong>Scan R2</strong> to auto-detect available scenarios.
        </p>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
          <input
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveScenario(); }}
            placeholder="e.g. brokered-exit"
            style={{
              flex: 1, padding: '7px 10px',
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)', color: 'var(--text)',
              fontSize: 13, fontFamily: 'var(--mono)',
            }}
          />
          <button
            className="btn-secondary"
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            onClick={scanScenarios}
            disabled={scanningR2}
          >
            {scanningR2 ? (
              <><div className="spinner" style={{ width: 11, height: 11 }} /> Scanning…</>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Scan R2
              </>
            )}
          </button>
          <button className="btn-submit" style={{ width: 'auto', flexShrink: 0 }} onClick={() => saveScenario()} disabled={savingScenario}>
            {savingScenario ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* R2 detected scenario pills */}
        {r2Scenarios.length > 0 && (
          <div style={{
            border: '1px solid var(--border)', borderRadius: 6,
            padding: '10px 12px', background: 'var(--surface-2, #f8fafc)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.08em', marginBottom: 8 }}>
              DETECTED IN R2 — click to select:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {r2Scenarios.map((s) => (
                <button
                  key={s.prefix}
                  onClick={() => { setScenarioName(s.name); saveScenario(s.name); }}
                  style={{
                    border: `1px solid ${scenarioName === s.name ? 'var(--primary)' : 'var(--border)'}`,
                    background: scenarioName === s.name ? 'rgba(0,176,255,0.1)' : 'var(--surface)',
                    color: scenarioName === s.name ? 'var(--primary)' : 'var(--text)',
                    borderRadius: 4, padding: '4px 10px', cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                    transition: 'all 0.15s',
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Squad Case Assignments ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--primary)' }}>
            Squad Case Assignments
          </div>
          {scenarioName.trim() && (
            <button
              className="btn-secondary"
              style={{ fontSize: 11, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={scanVictims}
              disabled={scanningVictims}
            >
              {scanningVictims ? (
                <><div className="spinner" style={{ width: 10, height: 10 }} /> Scanning…</>
              ) : (
                <>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Detect Victims
                </>
              )}
            </button>
          )}
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Assign each squad's victim or case name. Smart matching auto-routes drops to the correct squad during release.
        </p>

        {/* Detected victims legend */}
        {r2Victims.length > 0 && (
          <div style={{
            border: '1px solid rgba(0,176,255,0.25)',
            borderRadius: 6, padding: '10px 12px',
            background: 'rgba(0,176,255,0.03)',
            marginBottom: 12,
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '.08em', marginBottom: 8 }}>
              {r2Victims.length} VICTIM{r2Victims.length !== 1 ? 'S' : ''} DETECTED ACROSS {
                (() => {
                  const allDrops = new Set(r2Victims.flatMap((v) => v.drops));
                  return allDrops.size;
                })()
              } DROP{
                (() => {
                  const allDrops = new Set(r2Victims.flatMap((v) => v.drops));
                  return allDrops.size !== 1 ? 'S' : '';
                })()
              }:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {r2Victims.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text)', flex: 1,
                  }}>
                    {v.name}
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {v.drops.map((d) => (
                      <span key={d} style={{
                        fontFamily: 'var(--mono)', fontSize: 9, padding: '1px 6px',
                        borderRadius: 3, background: 'rgba(0,176,255,0.1)',
                        border: '1px solid rgba(0,176,255,0.25)',
                        color: 'var(--primary)', whiteSpace: 'nowrap',
                      }}>
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingSquads ? (
          <div className="spinner" />
        ) : squads.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No squads found for this cohort. Create squads first.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...squads].sort((a, b) => a.number - b.number).map((sq) => {
              const color = SQUAD_COLORS[sq.number] ?? 'var(--primary)';
              const pickerOpen = victimPickerSq === sq.id;

              // Auto-suggest victims for this squad based on detected victims
              const squadHintName = `squad-${sq.number}`;
              const suggestions = r2Victims.filter((v) =>
                !v.squadHint ||
                v.squadHint.replace(/\D/g, '') === String(sq.number)
              );

              return (
                <div key={sq.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 64, flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 10,
                      fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color,
                    }}>
                      SQUAD {sq.number}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--muted)', width: 110, flexShrink: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {sq.name || '—'}
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          value={caseNames[sq.id] ?? ''}
                          onChange={(e) => setCaseNames((p) => ({ ...p, [sq.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveCaseName(sq.id); }}
                          onFocus={() => suggestions.length > 0 && setVictimPickerSq(sq.id)}
                          placeholder="victim / case name…"
                          style={{
                            flex: 1, padding: '6px 10px',
                            border: `1.5px solid ${color}55`,
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
                          }}
                        />
                        {suggestions.length > 0 && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: 11, padding: '4px 8px', flexShrink: 0 }}
                            onClick={() => setVictimPickerSq(pickerOpen ? null : sq.id)}
                            title="Pick from detected victims"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points={pickerOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}/>
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Victim dropdown */}
                      {pickerOpen && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                          marginTop: 2, maxHeight: 200, overflowY: 'auto',
                        }}>
                          {suggestions.map((v, i) => (
                            <button
                              key={i}
                              onClick={() => saveCaseName(sq.id, v.name)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                width: '100%', textAlign: 'left',
                                padding: '8px 12px', background: 'none', border: 'none',
                                cursor: 'pointer', fontSize: 13, color: 'var(--text)',
                                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2, #f8fafc)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                              </svg>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{v.name}</span>
                              {v.squadHint && (
                                <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>
                                  {v.squadHint}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn-sm-primary"
                      style={{ flexShrink: 0 }}
                      onClick={() => saveCaseName(sq.id)}
                      disabled={!!savingSquad[sq.id]}
                    >
                      {savingSquad[sq.id] ? '…' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Target Reveal */}
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
          Investigation Target
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
          borderRadius: 10,
          border: `1px solid ${revealed ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
          background: revealed ? 'rgba(16,185,129,0.04)' : 'var(--surface)',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em',
              textTransform: 'uppercase', color: revealed ? '#10b981' : 'var(--muted)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: revealed ? '#10b981' : 'var(--muted)', flexShrink: 0 }} />
              {revealed ? 'TARGET REVEALED — students can see their investigation target' : 'TARGET CLASSIFIED — students see a redacted pending state'}
            </div>
          </div>
          <button
            onClick={toggleTarget}
            disabled={targetBusy}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 18px', borderRadius: 7,
              border: `1px solid ${revealed ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.4)'}`,
              background: revealed ? 'rgba(239,68,68,0.07)' : 'rgba(16,185,129,0.08)',
              color: revealed ? '#ef4444' : '#10b981',
              fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '.14em', textTransform: 'uppercase',
              cursor: targetBusy ? 'not-allowed' : 'pointer',
              opacity: targetBusy ? 0.5 : 1, flexShrink: 0,
            }}
          >
            {targetBusy ? '...' : revealed ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Conceal Target
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                </svg>
                Reveal Target
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function DropReleasePanel({ cohort }) {
  const [squads,    setSquads]    = useState([]);
  const [data,      setData]      = useState(null);
  const [prefix,    setPrefix]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState('');
  const [releasing, setReleasing] = useState({});
  const [released,  setReleased]  = useState({});

  const initialPrefix = useMemo(() => {
    if (!cohort.scenario_name) return 'pact/scenarios/';
    return `pact/scenarios/${cohort.scenario_name}/`;
  }, [cohort.scenario_name]);

  useEffect(() => {
    getSquadsByCohort(cohort.id)
      .then((d) => setSquads(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [cohort.id]);

  const load = useCallback((p) => {
    setLoading(true);
    setErr('');
    browseScenarioR2(p)
      .then((d) => { setData(d); setPrefix(p); })
      .catch(() => setErr('Failed to load R2. Check R2 credentials.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(initialPrefix); }, [initialPrefix, load]);

  const crumbs = useMemo(() => {
    if (!prefix) return [{ label: 'root', prefix: '' }];
    const parts = prefix.split('/').filter(Boolean);
    return [{ label: 'root', prefix: '' }].concat(
      parts.map((p, i) => ({
        label:  p,
        prefix: parts.slice(0, i + 1).join('/') + '/',
      })),
    );
  }, [prefix]);

  const doRelease = async (r2_key, name) => {
    const matchedSquad = detectSquad(name, squads);
    setReleasing((p) => ({ ...p, [r2_key]: true }));
    setErr('');
    try {
      await quickReleaseScenario({
        cohort_id:     cohort.id,
        r2_key,
        title:         name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        scenario_name: cohort.scenario_name || 'Unknown Scenario',
        squad_number:  matchedSquad?.number ?? null,
      });
      setReleased((p) => ({ ...p, [r2_key]: matchedSquad?.number ?? 0 }));
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Release failed');
    } finally {
      setReleasing((p) => ({ ...p, [r2_key]: false }));
    }
  };

  if (!cohort.scenario_name) {
    return (
      <div className="admin-empty" style={{ padding: 32 }}>
        <p>Set a <strong>Scenario Name</strong> in Cohort Setup before releasing drops.</p>
      </div>
    );
  }

  const noSquadCaseNames = squads.length > 0 && squads.every((sq) => !sq.case_name);

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
      {/* Legend bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          SCENARIO: <span style={{ color: 'var(--text)' }}>{cohort.scenario_name}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[...squads].sort((a, b) => a.number - b.number).map((sq) => {
            const color = SQUAD_COLORS[sq.number] ?? 'var(--primary)';
            return (
              <span key={sq.id} style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
                background: `${color}22`, color, border: `1px solid ${color}44`,
              }}>
                S{sq.number}{sq.case_name ? ` · ${sq.case_name}` : ''}
              </span>
            );
          })}
          <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, background: 'var(--surface-2, #f1f5f9)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            ALL SQUADS
          </span>
        </div>
      </div>

      {noSquadCaseNames && (
        <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#b45309' }}>
          No squad case names set — all drops will route to All Squads. Set case names in Cohort Setup for automatic matching.
        </div>
      )}

      {/* Breadcrumb */}
      <div className="r2-breadcrumb" style={{ marginBottom: 10 }}>
        {crumbs.map((c, i) => (
          <span key={c.prefix + i}>
            {i > 0 && <span className="r2-crumb-sep">/</span>}
            <button
              className={`r2-crumb${i === crumbs.length - 1 ? ' r2-crumb-active' : ''}`}
              onClick={() => load(c.prefix)}
              disabled={i === crumbs.length - 1}
            >{c.label}</button>
          </span>
        ))}
      </div>

      {err && <div className="err-msg" style={{ marginBottom: 8 }}>{err}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" /></div>
      ) : data && (
        <div className="r2-listing">
          {data.folders.length === 0 && data.files.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>Empty folder.</p>
          )}

          {data.folders.map((f) => {
            const matchedSquad = detectSquad(f.name, squads);
            const isReleased   = released[f.prefix] != null;
            const isReleasing  = !!releasing[f.prefix];
            return (
              <div key={f.prefix} className="r2-file-block">
                <div className="r2-row r2-folder" style={{ alignItems: 'center' }}>
                  <button
                    onClick={() => load(f.prefix)}
                    style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, minWidth: 0 }}
                  >
                    <span style={{ fontSize: 14, flexShrink: 0 }}>📁</span>
                    <span className="r2-name" style={{ textAlign: 'left' }}>{f.name}/</span>
                  </button>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                    {isReleased ? (
                      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: '#10b981' }}>
                        ✓ RELEASED {released[f.prefix] === 0 ? '→ ALL' : `→ S${released[f.prefix]}`}
                      </span>
                    ) : (
                      <>
                        <SquadChip squad={matchedSquad} />
                        <button
                          className="btn-sm-primary"
                          style={{ fontSize: 11 }}
                          disabled={isReleasing}
                          onClick={() => doRelease(f.prefix, f.name)}
                        >
                          {isReleasing ? '…' : 'Release'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {data.files.map((f) => {
            const matchedSquad = detectSquad(f.name, squads);
            const isReleased   = released[f.key] != null;
            const isReleasing  = !!releasing[f.key];
            return (
              <div key={f.key} className="r2-file-block">
                <div className="r2-row r2-file" style={{ alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="r2-name r2-file-link" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</a>
                    {f.size != null && <span className="r2-size" style={{ flexShrink: 0 }}>{formatR2Size(f.size)}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, marginLeft: 8 }}>
                    {isReleased ? (
                      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: '#10b981' }}>
                        ✓ RELEASED {released[f.key] === 0 ? '→ ALL' : `→ S${released[f.key]}`}
                      </span>
                    ) : (
                      <>
                        <SquadChip squad={matchedSquad} />
                        <button
                          className="btn-sm-primary"
                          style={{ fontSize: 11 }}
                          disabled={isReleasing}
                          onClick={() => doRelease(f.key, f.name)}
                        >
                          {isReleasing ? '…' : 'Release'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContentItemDetail({ item, cohorts, moduleAssignments = [], onUpdated, onDeleted }) {
  const [editing,           setEditing]           = useState(false);
  const [title,             setTitle]             = useState(item.title);
  const [description,       setDescription]       = useState(item.description ?? '');
  const [isPublished,       setIsPublished]       = useState(item.is_published);
  const [linkedAssignmentId, setLinkedAssignmentId] = useState(item.linked_assignment_id ?? '');
  const [saving,            setSaving]            = useState(false);
  const [err,               setErr]               = useState('');

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description ?? '');
    setIsPublished(item.is_published);
    setLinkedAssignmentId(item.linked_assignment_id ?? '');
  }, [item.id]);

  const handleSave = async () => {
    setSaving(true); setErr('');
    try {
      const updated = await updateContentItem(item.id, {
        title,
        description,
        is_published:        isPublished,
        linked_assignment_id: linkedAssignmentId || null,
      });
      onUpdated(updated); setEditing(false);
    } catch { setErr('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try { await deleteContentItem(item.id); onDeleted(item.id); } catch { setErr('Delete failed'); }
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
            <label>Linked Module</label>
            <select value={linkedAssignmentId} onChange={(e) => setLinkedAssignmentId(e.target.value)}>
              <option value="">— None —</option>
              {moduleAssignments.sort((a, b) => a.order_index - b.order_index).map((m) => (
                <option key={m.id} value={m.id}>{m.title}</option>
              ))}
            </select>
          </div>
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
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
          {(() => {
            const linked = moduleAssignments.find((m) => m.id === item.linked_assignment_id);
            return (
              <div style={{ marginBottom: 16 }}>
                <div className="section-label" style={{ marginBottom: 4 }}>Linked Module</div>
                <span style={{ fontSize: 13, color: linked ? 'var(--bright)' : 'var(--muted)' }}>
                  {linked ? linked.title : '— None —'}
                </span>
              </div>
            );
          })()}
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
