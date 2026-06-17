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
  updateScenario,
  deleteScenario,
  unlockScenario,
  lockScenario,
  browseScenarioR2,
  presignScenarioUpload,
  deleteScenarioR2Object,
  createScenario,
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

  // scenarios state
  const [scenarios,    setScenarios]    = useState([]);
  const [scenariosLoaded, setScenariosLoaded] = useState(false);

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

  const switchToScenarios = useCallback(() => {
    setAdminPanel('scenarios');
    if (!scenariosLoaded) {
      getScenarios()
        .then((data) => { setScenarios(Array.isArray(data) ? data : []); setScenariosLoaded(true); })
        .catch(() => setScenariosLoaded(true));
    }
  }, [scenariosLoaded]);

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
          className={`admin-panel-tab${adminPanel === 'scenarios' ? ' active' : ''}`}
          onClick={switchToScenarios}
        >
          Scenario Gating
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
          File Library
        </button>
        <button
          className={`admin-panel-tab${adminPanel === 'campaign' ? ' active' : ''}`}
          onClick={() => setAdminPanel('campaign')}
        >
          Campaign Drops
        </button>
        <button
          className={`admin-panel-tab${adminPanel === 'casefile' ? ' active' : ''}`}
          onClick={() => setAdminPanel('casefile')}
        >
          Case File
        </button>
      </div>

      {adminPanel === 'casefile' ? (
        <CaseFilePanel cohorts={cohorts} onCohortsChange={setCohorts} />
      ) : adminPanel === 'campaign' ? (
        <CampaignDropsPanel cohorts={cohorts} />
      ) : adminPanel === 'library' ? (
        <FileLibraryPanel
          onContentPublished={() => setContentLoaded(false)}
        />
      ) : adminPanel === 'content' ? (
        <CourseContentPanel
          items={contentItems}
          cohorts={cohorts}
          loaded={contentLoaded}
          onItemsChange={setContentItems}
        />
      ) : adminPanel === 'scenarios' ? (
        <ScenarioGatingPanel
          scenarios={scenarios}
          cohorts={cohorts}
          loaded={scenariosLoaded}
          onScenariosChange={setScenarios}
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
            {filtered.map((a) => {
              const color = TYPE_COLOR[a.type] ?? TYPE_COLOR.module;
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
            })}
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
                <button
                  className={`admin-right-tab${rightTab === 'gating' ? ' active' : ''}`}
                  onClick={() => { setRightTab('gating'); setSelectedSub(null); }}
                >
                  Access Gating
                </button>
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

/* ── R2 File Browser ── */

function R2FileBrowser({ rootPrefix }) {
  const [prefix,  setPrefix]  = useState(rootPrefix);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const load = useCallback((p) => {
    setLoading(true);
    setError('');
    browseScenarioR2(p)
      .then((d) => { setData(d); setPrefix(p); })
      .catch(() => setError('Failed to load R2 contents.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(rootPrefix); }, [rootPrefix, load]);

  /* breadcrumb segments from rootPrefix to current prefix */
  const crumbs = (() => {
    const rel   = prefix.slice(rootPrefix.length);
    const parts = rel.split('/').filter(Boolean);
    return [{ label: rootPrefix.split('/').filter(Boolean).pop() ?? 'root', prefix: rootPrefix }]
      .concat(parts.map((p, i) => ({
        label:  p,
        prefix: rootPrefix + parts.slice(0, i + 1).join('/') + '/',
      })));
  })();

  const handleDelete = async (key, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteScenarioR2Object(key);
      load(prefix);
    } catch { setError('Delete failed.'); }
  };

  return (
    <div className="r2-browser">
      {/* breadcrumb */}
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
            <button key={f.prefix} className="r2-row r2-folder" onClick={() => load(f.prefix)}>
              <span className="r2-icon">📁</span>
              <span className="r2-name">{f.name}/</span>
            </button>
          ))}
          {data.files.map((f) => (
            <div key={f.key} className="r2-row r2-file">
              <span className="r2-icon">📄</span>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="r2-name r2-file-link">{f.name}</a>
              {f.size != null && <span className="r2-size">{formatR2Size(f.size)}</span>}
              <button className="r2-del-btn" onClick={() => handleDelete(f.key, f.name)} title="Delete">✕</button>
            </div>
          ))}
        </div>
      )}

      <ScenarioUploadZone prefix={prefix} onUploaded={() => load(prefix)} />
    </div>
  );
}

function ScenarioUploadZone({ prefix, onUploaded }) {
  const inputRef   = useRef();
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(null);
  const [error,     setError]     = useState('');

  const upload = async (file) => {
    setUploading(true);
    setProgress(0);
    setError('');
    try {
      const key = prefix + file.name;
      const { uploadUrl } = await presignScenarioUpload(key, file.type || 'application/octet-stream');

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload  = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.send(file);
      });

      setProgress(null);
      onUploaded();
    } catch (e) {
      setError(e.message ?? 'Upload failed.');
      setProgress(null);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div
      className={`r2-upload-zone${uploading ? ' r2-uploading' : ''}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) upload(e.target.files[0]); }} />
      {uploading ? (
        <div className="r2-upload-progress">
          <div className="r2-progress-bar"><div className="r2-progress-fill" style={{ width: `${progress ?? 0}%` }} /></div>
          <span className="r2-progress-label">{progress != null ? `${progress}%` : 'Uploading…'}</span>
        </div>
      ) : (
        <span>↑ Drop file here or click to upload into <code>{prefix}</code></span>
      )}
      {error && <div className="err-msg" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function formatR2Size(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── File Library Panel ── */

function FileLibraryPanel({ onContentPublished }) {
  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
        Browse all files in R2 and publish them directly to the Course Content library for learners.
      </p>
      <R2PublishBrowser rootPrefix="" onPublished={onContentPublished} />
    </div>
  );
}

function R2PublishBrowser({ rootPrefix, onPublished }) {
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
                <button
                  className={`btn-sm-primary${releasingKey === f.prefix ? ' active' : ''}`}
                  style={{ marginLeft: 8, flexShrink: 0, fontSize: 11 }}
                  onClick={() => setReleasingKey(releasingKey === f.prefix ? null : f.prefix)}
                >
                  {releasingKey === f.prefix ? 'Cancel' : '↑ Release'}
                </button>
              </div>
              {releasingKey === f.prefix && (
                <FolderReleaseForm
                  folder={f}
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

function FolderReleaseForm({ folder, onReleased, onCancel }) {
  const defaultTitle = folder.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const [title,       setTitle]       = useState(defaultTitle);
  const [description, setDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');
  const [done,        setDone]        = useState(false);

  const handleRelease = async () => {
    if (!title.trim()) { setErr('Title is required'); return; }
    setSaving(true);
    setErr('');
    try {
      await createScenario({
        title:          title.trim(),
        description:    description.trim() || undefined,
        r2_key:         folder.prefix,
        file_name:      folder.name,
        release_number: 1,
        is_published:   isPublished,
      });
      setDone(true);
      setTimeout(onReleased, 1000);
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Release failed');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div style={{ padding: '8px 16px', color: '#10b981', fontSize: 13 }}>
        ✓ Added to Scenario Gating
      </div>
    );
  }

  return (
    <div className="publish-form">
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--mono)' }}>
        📁 {folder.prefix}
      </div>
      <div className="form-field">
        <label>Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="form-field">
        <label>Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <input type="checkbox" id="folder-pub" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        <label htmlFor="folder-pub" style={{ fontSize: 13, cursor: 'pointer' }}>Publish now</label>
      </div>
      {err && <div className="err-msg">{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn-submit" style={{ width: 'auto' }} onClick={handleRelease} disabled={saving}>
          {saving ? 'Releasing…' : 'Add to Scenario Gating'}
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

/* ── Scenario Gating Panel ── */

const SQUAD_LABELS = { 1: 'Squad 1 — Redstone Memorial', 2: 'Squad 2 — Dogwood Hotel', 3: 'Squad 3 — CyberDyne', 4: 'Squad 4 — PixelPlay' };

function ScenarioPackageForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title:          initial?.title          ?? '',
    description:    initial?.description    ?? '',
    scenario_name:  initial?.scenario_name  ?? '',
    release_number: initial?.release_number ?? 1,
    squad_number:   initial?.squad_number   ?? '',
    is_published:   initial?.is_published   ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSave({
        ...form,
        release_number: parseInt(form.release_number, 10) || 1,
        squad_number:   form.squad_number !== '' ? parseInt(form.squad_number, 10) : null,
      });
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scenario-form">
      <div className="scenario-form-row">
        <label className="admin-grade-label">Title *</label>
        <input className="admin-score-input" style={{ width: '100%' }} value={form.title}
          onChange={(e) => set('title', e.target.value)} placeholder="e.g. Operation Nightfall" />
      </div>
      <div className="scenario-form-row">
        <label className="admin-grade-label">Description</label>
        <textarea className="admin-feedback-textarea" value={form.description}
          onChange={(e) => set('description', e.target.value)} rows={2}
          placeholder="Brief scenario overview…" />
      </div>
      <div className="scenario-form-row" style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <label className="admin-grade-label">Release #</label>
          <input type="number" min={1} className="admin-score-input" value={form.release_number}
            onChange={(e) => set('release_number', e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 2 }}>
          <label className="admin-grade-label">Squad (leave blank for all squads)</label>
          <select
            value={form.squad_number}
            onChange={(e) => set('squad_number', e.target.value)}
            style={{ width: '100%', padding: '7px 10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}
          >
            <option value="">All squads</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{SQUAD_LABELS[n]}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, paddingBottom: 2 }}>
          <input type="checkbox" id="sp-pub" checked={!!form.is_published}
            onChange={(e) => set('is_published', e.target.checked)} />
          <label htmlFor="sp-pub" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            Published
          </label>
        </div>
      </div>
      {err && <div className="err-msg" style={{ marginBottom: 8 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button className="btn-submit" style={{ width: 'auto' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button className="admin-back-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ScenarioGatingPanel({ scenarios, cohorts, loaded, onScenariosChange }) {
  const [selected,   setSelected]   = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleting,   setDeleting]   = useState({});
  const [rightTab,   setRightTab]   = useState('files'); // 'files' | 'access'

  const handleUpdate = async (data) => {
    const pkg = await updateScenario(editTarget.id, data);
    onScenariosChange((prev) => prev.map((p) => p.id === pkg.id ? { ...p, ...pkg } : p));
    const updated = { ...editTarget, ...pkg };
    setEditTarget(null);
    setSelected(updated);
  };

  const handleDelete = async (pkg) => {
    if (!window.confirm(`Delete "${pkg.title}"? This cannot be undone.`)) return;
    setDeleting((d) => ({ ...d, [pkg.id]: true }));
    try {
      await deleteScenario(pkg.id);
      onScenariosChange((prev) => prev.filter((p) => p.id !== pkg.id));
      if (selected?.id === pkg.id) setSelected(null);
    } catch {}
    setDeleting((d) => ({ ...d, [pkg.id]: false }));
  };

  if (!loaded) return <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div className="admin-layout">
      {/* Left: package list */}
      <div className="admin-left">
        <div className="scenario-sync-note">
          Packages auto-populate from R2. Use the Files tab to upload and manage scenario files directly.
        </div>

        <div className="admin-assignment-list">
          {scenarios.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
              No files found in R2 yet.
            </p>
          )}
          {scenarios.map((pkg) => (
            <button
              key={pkg.id}
              className={`admin-assign-btn${selected?.id === pkg.id ? ' active' : ''}`}
              onClick={() => { setSelected(pkg); setEditTarget(null); }}
            >
              <span className="admin-assign-type" style={{ color: 'var(--primary)' }}>
                PKG {pkg.release_number}{pkg.squad_number ? ` · S${pkg.squad_number}` : ''}
              </span>
              <span className="admin-assign-title">{pkg.title}</span>
              {!pkg.is_published && <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>draft</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Right: edit form or cohort gating */}
      <div className="admin-right">
        {editTarget && (
          <>
            <div className="admin-right-header">
              <div className="admin-right-title">Edit Package</div>
              <button className="admin-back-btn" onClick={() => setEditTarget(null)}>Cancel</button>
            </div>
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              <ScenarioPackageForm initial={editTarget} onSave={handleUpdate} onCancel={() => setEditTarget(null)} />
            </div>
          </>
        )}

        {!editTarget && !selected && (
          <div className="admin-empty"><p>Select a package to manage cohort access.</p></div>
        )}

        {!editTarget && selected && (
          <>
            <div className="admin-right-header">
              <div>
                <div className="admin-right-title">{selected.title}</div>
                <div className="admin-right-sub">
                  Package {selected.release_number} · {selected.file_name}
                  {!selected.is_published && ' · Draft'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="admin-back-btn" onClick={() => setEditTarget(selected)}>Edit</button>
                <button
                  className="admin-back-btn"
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => handleDelete(selected)}
                  disabled={deleting[selected.id]}
                >
                  {deleting[selected.id] ? '…' : 'Delete'}
                </button>
              </div>
            </div>

            <div className="scenario-tabs">
              <button className={`scenario-tab${rightTab === 'files' ? ' active' : ''}`} onClick={() => setRightTab('files')}>Files</button>
              <button className={`scenario-tab${rightTab === 'access' ? ' active' : ''}`} onClick={() => setRightTab('access')}>Cohort Access</button>
            </div>

            {rightTab === 'files' && (
              <div style={{ padding: '12px 16px', overflowY: 'auto', flex: 1 }}>
                <R2FileBrowser key={selected.id} rootPrefix={selected.r2_key} />
              </div>
            )}

            {rightTab === 'access' && (
              <ScenarioGatingCohorts
                key={selected.id}
                pkg={selected}
                cohorts={cohorts}
                onUnlocksChange={(unlocks) => {
                  const updated = { ...selected, unlocks };
                  setSelected(updated);
                  onScenariosChange((prev) => prev.map((p) => p.id === selected.id ? updated : p));
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ScenarioGatingCohorts({ pkg, cohorts, onUnlocksChange }) {
  const [unlockedIds, setUnlockedIds] = useState(
    () => new Set((pkg.unlocks ?? []).map((u) => u.cohort_id))
  );
  const [busy,   setBusy]   = useState({});
  const [errors, setErrors] = useState({});

  const toggle = async (cohortId) => {
    const isUnlocked = unlockedIds.has(cohortId);
    setBusy((b) => ({ ...b, [cohortId]: true }));
    setErrors((e) => ({ ...e, [cohortId]: null }));
    try {
      if (isUnlocked) {
        await lockScenario(pkg.id, cohortId);
        const next = new Set(unlockedIds);
        next.delete(cohortId);
        setUnlockedIds(next);
        onUnlocksChange((pkg.unlocks ?? []).filter((u) => u.cohort_id !== cohortId));
      } else {
        await unlockScenario(pkg.id, cohortId);
        setUnlockedIds((s) => new Set([...s, cohortId]));
        onUnlocksChange([...(pkg.unlocks ?? []), { cohort_id: cohortId }]);
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
        Control which cohorts can download this scenario package.
      </p>
      <div className="admin-gating-list">
        {cohorts.map((c) => {
          const unlocked = unlockedIds.has(c.id);
          return (
            <div key={c.id} className="admin-gating-row">
              <div className="admin-gating-info">
                <span className="admin-gating-name">{c.name}</span>
                <span className={`admin-gating-badge ${unlocked ? 'badge-unlocked' : 'badge-locked'}`}>
                  {unlocked ? '🔓 Released' : '🔒 Locked'}
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
                {busy[c.id] ? '…' : unlocked ? 'Lock' : 'Release'}
              </button>
            </div>
          );
        })}
      </div>
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

function CampaignDropsPanel({ cohorts }) {
  const [drops,     setDrops]    = useState([]);
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
    getCampaignDrops(cohortId || undefined)
      .then((d) => setDrops(Array.isArray(d) ? d : []))
      .catch(() => setErr('Failed to load campaign drops.'))
      .finally(() => setLoading(false));
  }, [cohortId]);

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

function CourseContentPanel({ items, cohorts, loaded, onItemsChange }) {
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

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
  const [squads,        setSquads]        = useState([]);
  const [loadingSquads, setLoadingSquads] = useState(true);
  const [scenarioName,  setScenarioName]  = useState(cohort.scenario_name ?? '');
  const [savingScenario, setSavingScenario] = useState(false);
  const [caseNames,     setCaseNames]     = useState({});
  const [savingSquad,   setSavingSquad]   = useState({});
  const [targetBusy,    setTargetBusy]    = useState(false);
  const [err,           setErr]           = useState('');
  const [msg,           setMsg]           = useState('');

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

  const saveScenario = async () => {
    setSavingScenario(true);
    setErr('');
    try {
      const updated = await updateCohort(cohort.id, { scenario_name: scenarioName.trim() || null });
      onCohortUpdate(updated);
      flash('Scenario name saved.');
    } catch { setErr('Save failed.'); }
    finally { setSavingScenario(false); }
  };

  const saveCaseName = async (squadId) => {
    setSavingSquad((s) => ({ ...s, [squadId]: true }));
    try {
      await updateSquad(cohort.id, squadId, { case_name: caseNames[squadId]?.trim() || null });
      setSquads((prev) => prev.map((sq) => sq.id === squadId ? { ...sq, case_name: caseNames[squadId] } : sq));
      flash('Case name saved.');
    } catch { setErr('Save failed.'); }
    finally { setSavingSquad((s) => ({ ...s, [squadId]: false })); }
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

      {/* Scenario Assignment */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
          Scenario Assignment
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
          The scenario name must match the R2 folder name exactly (e.g. <code>packet heist</code>). Used to auto-navigate the R2 browser during drop releases.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') saveScenario(); }}
            placeholder="e.g. packet heist"
            style={{
              flex: 1, padding: '7px 10px',
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface)', color: 'var(--text)',
              fontSize: 13, fontFamily: 'var(--mono)',
            }}
          />
          <button className="btn-submit" style={{ width: 'auto', flexShrink: 0 }} onClick={saveScenario} disabled={savingScenario}>
            {savingScenario ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Squad Case Assignments */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: 8 }}>
          Squad Case Assignments
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Assign each squad's victim or case name. Smart matching compares these against R2 folder names during release to auto-route drops.
        </p>
        {loadingSquads ? (
          <div className="spinner" />
        ) : squads.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No squads found for this cohort. Create squads first.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...squads].sort((a, b) => a.number - b.number).map((sq) => {
              const color = SQUAD_COLORS[sq.number] ?? 'var(--primary)';
              return (
                <div key={sq.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  <input
                    value={caseNames[sq.id] ?? ''}
                    onChange={(e) => setCaseNames((p) => ({ ...p, [sq.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveCaseName(sq.id); }}
                    placeholder="victim / case name…"
                    style={{
                      flex: 1, padding: '6px 10px',
                      border: `1.5px solid ${color}55`,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
                    }}
                  />
                  <button
                    className="btn-sm-primary"
                    style={{ flexShrink: 0 }}
                    onClick={() => saveCaseName(sq.id)}
                    disabled={!!savingSquad[sq.id]}
                  >
                    {savingSquad[sq.id] ? '…' : 'Save'}
                  </button>
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
