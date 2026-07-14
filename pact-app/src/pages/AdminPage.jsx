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
  syncDecksFromR2,
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
  getLiveOverview,
  getAssignmentProgress,
} from '../api/pact.js';
import { VICTIMS } from '../constants/victims.js';

const TYPE_COLOR = {
  module:     '#2563eb',
  game:       '#059669',
  assessment: '#d97706',
  survey:     '#7c3aed',
  challenge:  '#dc2626',
  capstone:   '#b45309',
};

// Mirrors pact-app/src/pages/InductionSequence.jsx's PROF_ROLE_LABELS —
// kept in sync by hand, no shared constants module between pages.
const ROLE_LABELS = {
  special_agent:                    'Special Agent',
  intelligence_analyst:             'Intelligence Analyst',
  operational_support_sos:          'Operational Support Specialist',
  operational_support_da:           'Data Analyst',
  supervisory_special_agent:        'Supervisory Special Agent',
  supervisory_intelligence_analyst: 'Supervisory Intelligence Analyst',
  task_force_officer:               'Task Force Officer',
  cyber_analyst:                    'Cyber Analyst',
  digital_evidence_lead:            'Digital Evidence Lead / CART Liaison',
};
const ROLE_ORDER = Object.keys(ROLE_LABELS);

/* ── helpers ── */
function parseContent(content) {
  try {
    const p = JSON.parse(content ?? 'null');
    if (p?.answers)    return { type: 'quiz',        data: p };
    if (p?.responses)  return { type: 'deliverable', data: p };
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
              <div className="admin-qa-stem">{q?.stem ?? q?.stem?.en ?? a.questionId}</div>
              <div className="admin-qa-pts">{a.isCorrect ? '✓' : '✗'} {a.points}/{q?.scoring?.points ?? '?'} pts</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChallengeDeliverableReview({ delivData, questions = [], maxScore, assignmentId, userId, squadId, isSquad, existingGrade, onGradeSaved }) {
  const prompts      = questions.filter((q) => q.kind === 'prompt');
  const perPromptMax = prompts.length > 0 ? Math.round(maxScore / prompts.length) : maxScore;

  const initScores = () => {
    const ps = existingGrade?.promptScores ?? existingGrade?.prompt_scores;
    if (ps) return ps;
    return Object.fromEntries(prompts.map((_, i) => [i, '']));
  };

  const [promptScores, setPromptScores] = useState(initScores);
  const [feedback,     setFeedback]     = useState(existingGrade?.feedback ?? '');
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');

  const total     = prompts.reduce((sum, _, i) => { const v = parseFloat(promptScores[i]); return sum + (isNaN(v) ? 0 : v); }, 0);
  const allScored = prompts.every((_, i) => promptScores[i] !== '' && !isNaN(parseFloat(promptScores[i])));

  const handleSave = async () => {
    if (!allScored) { setErr('Score every deliverable before saving.'); return; }
    const s = Math.min(total, maxScore);
    setSaving(true);
    setErr('');
    try {
      const gradeData = { score: s, feedback, promptScores };
      if (isSquad && squadId) await submitSquadGrade(assignmentId, squadId, gradeData);
      else                    await submitGrade(assignmentId, userId, gradeData);
      onGradeSaved(gradeData);
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setScore = (i, v) => setPromptScores((prev) => ({ ...prev, [i]: String(v) }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {prompts.map((q, i) => {
        const response  = delivData.responses?.[i] ?? '';
        const rubric    = q.rubric;
        const pts       = q.points ?? perPromptMax;
        const scoreVal  = promptScores[i];
        const scoreNum  = parseFloat(scoreVal);
        const pct       = (!isNaN(scoreNum) && pts > 0) ? scoreNum / pts : null;
        const scoreColor = pct === null ? 'var(--border-hi)' : pct >= 0.8 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444';
        const quickPts  = [...new Set([0, Math.round(pts * 0.5), Math.round(pts * 0.75), pts])];

        return (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>

            {/* ── Header: prompt text + score ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', background: 'var(--surface-2, var(--surface))' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--primary)', letterSpacing: '.14em', paddingTop: 2, flexShrink: 0 }}>
                {String(i + 1).padStart(2, '0')} / {String(prompts.length).padStart(2, '0')}
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--bright)', lineHeight: 1.5 }}>{q.text}</span>
              {/* Score widget */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <input
                    type="number"
                    min={0}
                    max={pts}
                    value={scoreVal}
                    onChange={(e) => setScore(i, e.target.value)}
                    placeholder="—"
                    style={{
                      width: 52, padding: '4px 6px', textAlign: 'center', borderRadius: 4,
                      border: `1.5px solid ${scoreColor}`, background: 'var(--surface)',
                      color: pct === null ? 'var(--text)' : scoreColor,
                      fontSize: 16, fontFamily: 'var(--mono)', fontWeight: 700,
                    }}
                  />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>/ {pts} pts</span>
                </div>
                {/* Quick-pick buttons */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {quickPts.map((v) => {
                    const active = parseFloat(scoreVal) === v;
                    return (
                      <button key={v} onClick={() => setScore(i, v)} style={{
                        padding: '1px 6px', borderRadius: 3, border: `1px solid ${active ? scoreColor : 'var(--border-hi)'}`,
                        background: active ? scoreColor : 'transparent',
                        color: active ? '#fff' : 'var(--muted)',
                        fontSize: 10, fontFamily: 'var(--mono)', cursor: 'pointer',
                      }}>{v}</button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Body: response + rubric side-by-side ── */}
            <div style={{ display: 'grid', gridTemplateColumns: rubric ? '1fr 1fr' : '1fr', borderTop: '1px solid var(--border)' }}>

              {/* Response */}
              <div style={{ padding: '10px 14px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)', marginBottom: 6 }}>SQUAD RESPONSE</div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12, color: 'var(--text)', lineHeight: 1.65, maxHeight: 240, overflowY: 'auto' }}>
                  {response || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No response submitted</span>}
                </pre>
              </div>

              {/* Rubric — always visible, no toggle */}
              {rubric && (
                <div style={{ padding: '10px 14px', borderLeft: '1px solid var(--border)', background: 'rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rubric.keyElements?.length > 0 && (
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: '#10b981', marginBottom: 5 }}>EXPECTED ELEMENTS</div>
                      <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {rubric.keyElements.map((el, j) => (
                          <li key={j} style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.5 }}>{el}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {rubric.commonErrors?.length > 0 && (
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: '#ef4444', marginBottom: 5 }}>WATCH FOR</div>
                      <ul style={{ margin: 0, paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {rubric.commonErrors.map((er, j) => (
                          <li key={j} style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>{er}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Score summary + feedback + save ── */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)' }}>TOTAL SCORE</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: allScored ? '#10b981' : 'var(--muted)' }}>
            {allScored ? total : '—'} <span style={{ fontSize: 13, color: 'var(--muted)' }}>/ {maxScore}</span>
          </span>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--muted)', marginBottom: 6 }}>INSTRUCTOR FEEDBACK (optional)</div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Overall feedback for the squad…"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, resize: 'vertical' }}
          />
        </div>
        {err && <div className="err-msg">{err}</div>}
        <button className="btn-submit" style={{ width: 'auto', alignSelf: 'flex-start' }} onClick={handleSave} disabled={saving || !allScored}>
          {saving ? 'Saving…' : existingGrade ? 'Update Grade' : 'Save Grade'}
        </button>
      </div>
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

  // top-level admin panel: 'grading' | 'cohorts' | 'content' | 'library' | 'campaign'
  const [adminPanel, setAdminPanel] = useState('grading');

  // course content state
  const [contentItems,   setContentItems]   = useState([]);
  const [contentLoaded,  setContentLoaded]  = useState(false);


  // filter: 'individual' | 'squad'
  const [modeFilter,    setModeFilter]    = useState('individual');
  const [pendingOnly,   setPendingOnly]   = useState(false);

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
      getCourseContent(true)
        .then((data) => { setContentItems(Array.isArray(data) ? data : []); setContentLoaded(true); })
        .catch(() => setContentLoaded(true));
    }
  }, [contentLoaded]);

  const switchToLibrary = useCallback(() => setAdminPanel('library'), []);

  const openAssignment = useCallback(async (a) => {
    setSelectedAssignment(a);
    setSelectedSub(null);
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
    setSavedGrades((prev) => {
      const isNew = prev[sub.id] == null && grades[sub.user_id] == null;
      if (isNew) {
        setAssignments((as) => as.map((a) =>
          a.id === sub.assignment_id
            ? { ...a, pending_count: Math.max(0, (a.pending_count ?? 1) - 1), graded_count: (a.graded_count ?? 0) + 1 }
            : a
        ));
      }
      return { ...prev, [sub.id]: result };
    });
  }, [grades]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const filtered = pendingOnly
    ? assignments.filter((a) => (a.pending_count ?? 0) > 0)
    : assignments.filter((a) => a.grading_mode === modeFilter && (a.graded_count ?? 0) > 0);

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
        <button
          className={`admin-panel-tab${adminPanel === 'cohorts' ? ' active' : ''}`}
          onClick={() => setAdminPanel('cohorts')}
        >
          Cohorts
        </button>
        <button
          className={`admin-panel-tab${adminPanel === 'live' ? ' active' : ''}`}
          onClick={() => setAdminPanel('live')}
        >
          Live Progress
        </button>
      </div>

      {adminPanel === 'live' ? (
        <LiveProgressPanel />
      ) : adminPanel === 'library' ? (
        <ContentGatingPanel
          assignments={assignments}
          cohorts={cohorts}
          contentItems={contentItems}
          onAssignmentsChange={setAssignments}
          onContentPublished={() => setContentLoaded(false)}
        />
      ) : adminPanel === 'cohorts' ? (
        <CohortScenarioPanel
          cohorts={cohorts}
          onCohortsChange={setCohorts}
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
            <button
              className={`admin-mode-tab${pendingOnly ? ' active' : ''}`}
              style={pendingOnly ? { borderColor: '#f59e0b', color: '#f59e0b' } : { color: 'var(--muted)' }}
              onClick={() => { setPendingOnly((v) => !v); setSelectedAssignment(null); }}
              title="Show only assignments with ungraded submissions"
            >
              Pending
              {assignments.filter((a) => (a.pending_count ?? 0) > 0).length > 0 && (
                <span style={{
                  marginLeft: 5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 16, height: 16, borderRadius: 8, fontSize: 9, fontFamily: 'var(--mono)',
                  background: '#f59e0b', color: '#000', fontWeight: 700, padding: '0 3px',
                }}>
                  {assignments.filter((a) => (a.pending_count ?? 0) > 0).length}
                </span>
              )}
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

              // Group challenges: scenario → victim (two levels)
              const scenMap = new Map(); // scenKey → Map<victimKey, Assignment[]>
              for (const a of challenges) {
                const sk = a.scenario_name ?? '__unassigned__';
                const vk = a.victim_name   ?? '__no_victim__';
                if (!scenMap.has(sk)) scenMap.set(sk, new Map());
                const vm = scenMap.get(sk);
                if (!vm.has(vk)) vm.set(vk, []);
                vm.get(vk).push(a);
              }
              const scenGroups = [...scenMap.entries()].sort(([a], [b]) => {
                if (a === '__unassigned__') return 1;
                if (b === '__unassigned__') return -1;
                return a.localeCompare(b);
              });
              for (const [, vm] of scenGroups)
                for (const items of vm.values()) items.sort((a, b) => a.order_index - b.order_index);

              const renderBtn = (a, indent = false) => {
                const color    = TYPE_COLOR[a.type] ?? TYPE_COLOR.module;
                const isActive = selectedAssignment?.id === a.id;
                const pending  = a.pending_count ?? 0;
                return (
                  <button
                    key={a.id}
                    className={`admin-assign-btn${isActive ? ' active' : ''}`}
                    style={indent ? { paddingLeft: 28 } : undefined}
                    onClick={() => openAssignment(a)}
                  >
                    <span className="admin-assign-type" style={{ color }}>{a.type.toUpperCase()}</span>
                    <span className="admin-assign-title">{a.title}</span>
                    {pending > 0 && (
                      <span style={{
                        marginLeft: 'auto', flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 18, height: 18, borderRadius: 9, fontSize: 9, fontFamily: 'var(--mono)',
                        background: '#f59e0b', color: '#000', fontWeight: 700, padding: '0 4px',
                      }}>
                        {pending}
                      </span>
                    )}
                  </button>
                );
              };

              return (
                <>
                  {nonChallenges.map((a) => renderBtn(a, false))}

                  {scenGroups.length > 0 && (
                    <>
                      {nonChallenges.length > 0 && (
                        <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                      )}
                      {scenGroups.map(([sk, vm]) => (
                        <div key={sk}>
                          {/* Scenario heading */}
                          <div style={{ padding: '6px 14px 2px', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.14em', color: 'var(--primary)', textTransform: 'uppercase' }}>
                            {scenarioLabel(sk === '__unassigned__' ? null : sk)}
                          </div>
                          {[...vm.entries()].sort(([a], [b]) => {
                            if (a === '__no_victim__') return 1;
                            if (b === '__no_victim__') return -1;
                            return a.localeCompare(b);
                          }).map(([vk, items]) => (
                            <div key={vk}>
                              {/* Victim sub-heading */}
                              <div style={{ padding: '3px 14px 2px 22px', fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: '.1em', color: '#f87171', textTransform: 'uppercase' }}>
                                {vk === '__no_victim__' ? 'Unassigned' : vk}
                              </div>
                              {items.map((a) => renderBtn(a, true))}
                            </div>
                          ))}
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
                {selectedSub && (
                  <button className="admin-back-btn" onClick={() => setSelectedSub(null)}>
                    ← All Submissions
                  </button>
                )}
              </div>

              {loadingSubs ? (
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
                  onSelect={setSelectedSub}
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

function SquadSubmissions({ groups, grades, savedGrades, onSelect }) {
  if (groups.length === 0) {
    return <div className="admin-empty"><p>No submissions yet.</p></div>;
  }

  return (
    <div className="admin-sub-list">
      {groups.map((group) => {
        const squadNum  = group.squad?.number ?? '?';
        const squadName = group.squad?.name;

        // Canonical submission: most recent submitted/graded one, else most recent overall
        const canonical = [...group.subs]
          .sort((a, b) => new Date(b.submitted_at ?? 0) - new Date(a.submitted_at ?? 0))
          .find((s) => ['submitted', 'graded', 'returned'].includes(s.status))
          ?? group.subs[0];

        if (!canonical) return null;

        // Grade: check in-session savedGrades first, then grades keyed by user_id
        const grade  = savedGrades[canonical.id] ?? grades[canonical.user_id];
        const graded = grade != null;
        const pct    = graded ? Math.round((grade.score / (grade.max_score ?? 100)) * 100) : null;
        const memberCount = group.subs.length;

        return (
          <button key={group.squad?.id ?? 'unassigned'} className="admin-sub-row" onClick={() => onSelect(canonical)}>
            <div className="admin-sub-avatar" style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700 }}>
              {group.squad ? `S${squadNum}` : '?'}
            </div>
            <div className="admin-sub-info">
              <div className="admin-sub-name">
                {group.squad ? `Squad ${squadNum}${squadName ? ` · ${squadName}` : ''}` : 'Unassigned'}
              </div>
              <div className="admin-sub-meta">
                {canonical.student?.first_name} {canonical.student?.last_name}
                {memberCount > 1 && ` +${memberCount - 1} more`}
                {' · '}{canonical.status}
                {' · '}{canonical.submitted_at ? new Date(canonical.submitted_at).toLocaleDateString() : 'in progress'}
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

function formatR2Size(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Content Gating Panel ── */

const R2_SCENARIOS_PREFIX = 'scenarios/';

/* ═══════════════════════════════════════════════════════════
   COHORT SCENARIO PANEL
═══════════════════════════════════════════════════════════ */
function CohortScenarioPanel({ cohorts, onCohortsChange }) {
  const [scenarioFolders, setScenarioFolders] = useState(null);
  const [saving,          setSaving]          = useState({});
  const [flash,           setFlash]           = useState({});

  // Squad → victim assignment (expand-per-cohort)
  const [expandedCohortId, setExpandedCohortId] = useState(null);
  const [squadsByCohort,   setSquadsByCohort]   = useState({}); // cohortId -> squad[]
  const [loadingSquads,    setLoadingSquads]    = useState(false);
  const [savingSquad,      setSavingSquad]      = useState({}); // squadId -> bool

  useEffect(() => {
    browseScenarioR2(R2_SCENARIOS_PREFIX)
      .then((d) => setScenarioFolders((d.folders ?? []).map((f) => f.name)))
      .catch(() => setScenarioFolders([]));
  }, []);

  const toggleSquads = (cohortId) => {
    if (expandedCohortId === cohortId) { setExpandedCohortId(null); return; }
    setExpandedCohortId(cohortId);
    if (!squadsByCohort[cohortId]) {
      setLoadingSquads(true);
      getSquadsByCohort(cohortId)
        .then((data) => setSquadsByCohort((p) => ({ ...p, [cohortId]: Array.isArray(data) ? data : [] })))
        .catch(() => setSquadsByCohort((p) => ({ ...p, [cohortId]: [] })))
        .finally(() => setLoadingSquads(false));
    }
  };

  const saveVictim = async (cohortId, squadId, victimCode) => {
    setSavingSquad((s) => ({ ...s, [squadId]: true }));
    try {
      await updateSquad(cohortId, squadId, { victim_code: victimCode || null });
      setSquadsByCohort((p) => ({
        ...p,
        [cohortId]: (p[cohortId] ?? []).map((sq) => sq.id === squadId ? { ...sq, victim_code: victimCode || null } : sq),
      }));
    } catch {}
    finally { setSavingSquad((s) => ({ ...s, [squadId]: false })); }
  };

  const handleScenarioChange = async (cohort, scenarioName) => {
    setSaving((s) => ({ ...s, [cohort.id]: true }));
    try {
      await updateCohort(cohort.id, { scenario_name: scenarioName || null });
      onCohortsChange((prev) => prev.map((c) => c.id === cohort.id ? { ...c, scenario_name: scenarioName || null } : c));
      setFlash((f) => ({ ...f, [cohort.id]: 'saved' }));
      setTimeout(() => setFlash((f) => ({ ...f, [cohort.id]: null })), 1800);
    } catch {
      setFlash((f) => ({ ...f, [cohort.id]: 'error' }));
      setTimeout(() => setFlash((f) => ({ ...f, [cohort.id]: null })), 2500);
    } finally {
      setSaving((s) => ({ ...s, [cohort.id]: false }));
    }
  };

  const [revealing, setRevealing] = useState({});

  const toggleTargetReveal = async (cohort) => {
    setRevealing((r) => ({ ...r, [cohort.id]: true }));
    try {
      const updated = await updateCohort(cohort.id, { target_revealed: !cohort.target_revealed });
      onCohortsChange((prev) => prev.map((c) => c.id === cohort.id ? { ...c, ...updated } : c));
    } catch {}
    finally { setRevealing((r) => ({ ...r, [cohort.id]: false })); }
  };

  if (cohorts.length === 0) {
    return (
      <div style={{ padding: 32 }}>
        <div className="ops-empty-label">NO COHORTS</div>
        <div className="ops-empty-sub">Create cohorts via the enrollment panel first.</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 640 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)', marginBottom: 4 }}>
        COHORT SCENARIOS
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
        Assign a scenario to each cohort. Students in that cohort will only see scenario files and intel packages for their assigned scenario.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cohorts.map((cohort) => {
          const isSaving    = !!saving[cohort.id];
          const flashState  = flash[cohort.id];
          const hasScenario = !!cohort.scenario_name;

          const isExpanded = expandedCohortId === cohort.id;
          const squads     = squadsByCohort[cohort.id] ?? [];

          return (
            <div key={cohort.id} style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                {/* Cohort info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--bright)', marginBottom: 2 }}>{cohort.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.1em', color: hasScenario ? 'var(--primary)' : 'var(--muted)' }}>
                    {hasScenario ? `◉ ${scenarioLabel(cohort.scenario_name)}` : '◌ NO SCENARIO ASSIGNED'}
                  </div>
                </div>

                {/* Scenario selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {scenarioFolders === null ? (
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                  ) : (
                    <select
                      value={cohort.scenario_name ?? ''}
                      onChange={(e) => handleScenarioChange(cohort, e.target.value)}
                      disabled={isSaving}
                      style={{
                        padding: '5px 10px', borderRadius: 4, border: '1px solid var(--border)',
                        background: 'var(--surface-2, var(--bg))', color: 'var(--text)',
                        fontSize: 12, fontFamily: 'var(--mono)', cursor: 'pointer',
                        minWidth: 180,
                      }}
                    >
                      <option value="">— Unassigned —</option>
                      {scenarioFolders.map((name) => (
                        <option key={name} value={name}>{scenarioLabel(name)}</option>
                      ))}
                    </select>
                  )}

                  {/* Save feedback */}
                  {isSaving && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>SAVING…</span>}
                  {flashState === 'saved' && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#10b981' }}>◉ SAVED</span>}
                  {flashState === 'error' && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#ef4444' }}>FAILED</span>}
                </div>

                <button
                  className={cohort.target_revealed ? 'btn-secondary' : 'btn-primary'}
                  style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
                  disabled={!!revealing[cohort.id]}
                  onClick={() => toggleTargetReveal(cohort)}
                  title="Reveals each squad's assigned victim per their Squad Victims selection below"
                >
                  {revealing[cohort.id] ? 'SAVING…' : cohort.target_revealed ? 'Conceal Target' : 'Reveal Target'}
                </button>

                <button
                  className="btn-secondary"
                  style={{ fontSize: 11, padding: '4px 10px', flexShrink: 0 }}
                  onClick={() => toggleSquads(cohort.id)}
                >
                  {isExpanded ? 'Hide Squads' : 'Squad Victims'}
                </button>
              </div>

              {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'var(--surface-2, #f8fafc)' }}>
                  {loadingSquads && !squadsByCohort[cohort.id] ? (
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                  ) : squads.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>No squads found for this cohort.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[...squads].sort((a, b) => a.number - b.number).map((sq) => {
                        const thisVictim = sq.victim_code ?? '';
                        const duplicateVictim = thisVictim && squads.some(
                          (other) => other.id !== sq.id && (other.victim_code ?? '') === thisVictim
                        );
                        return (
                          <div key={sq.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 70, flexShrink: 0, fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>
                              SQUAD {sq.number}
                            </div>
                            <select
                              value={thisVictim}
                              onChange={(e) => saveVictim(cohort.id, sq.id, e.target.value)}
                              disabled={!!savingSquad[sq.id]}
                              style={{
                                width: 160, padding: '5px 8px', borderRadius: 4,
                                border: `1.5px solid ${duplicateVictim ? '#f59e0b' : 'var(--border)'}`,
                                background: 'var(--surface)', color: 'var(--text)',
                                fontSize: 12, fontFamily: 'var(--mono)',
                              }}
                            >
                              <option value="">No victim assigned</option>
                              {Object.values(VICTIMS).map((v) => (
                                <option key={v.code} value={v.code}>{v.code}</option>
                              ))}
                            </select>
                            {savingSquad[sq.id] && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>SAVING…</span>}
                            {duplicateVictim && (
                              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#f59e0b' }}>
                                already used by another squad
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: '12px 14px', border: '1px solid var(--border-hi)', borderRadius: 6, background: 'rgba(0,176,255,.04)' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.12em', color: 'var(--primary)', marginBottom: 4 }}>HOW SCENARIO FILTERING WORKS</div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          When a scenario is assigned, students in that cohort will only see unlocked intel packages tagged with that scenario. Unassigned cohorts see all unlocked packages regardless of scenario.
        </p>
      </div>
    </div>
  );
}

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
        <button className={`admin-mode-tab${subTab === 'release'    ? ' active' : ''}`} onClick={() => setSubTab('release')}>
          Release Drops
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

      {subTab === 'release' && (
        <CampaignDropsPanel
          cohorts={cohorts}
          assignments={assignments}
          contentItems={contentItems}
          onAssignmentsChange={onAssignmentsChange}
          onContentPublished={onContentPublished}
        />
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
  const [selected,    setSelected]    = useState(null);
  const [showR2,      setShowR2]      = useState(false);
  const [localItems,  setLocalItems]  = useState(contentItems);
  const [syncing,     setSyncing]     = useState(false);
  const [syncResult,  setSyncResult]  = useState(null);

  useEffect(() => { setLocalItems(contentItems); }, [contentItems]);

  const handleItemAdded = () => {
    setShowR2(false);
    onItemAdded?.();
  };

  const handleSyncDecks = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncDecksFromR2();
      setSyncResult(result);
      if (result.added > 0) onItemAdded?.();
    } catch {
      setSyncResult({ error: true });
    } finally {
      setSyncing(false);
    }
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
      {/* R2 toolbar */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20 }}>
        <button
          onClick={() => setShowR2((b) => !b)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
        >
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)' }}>
            ADD FROM R2
          </span>
          <span style={{ color: 'var(--muted)', fontSize: 10, fontFamily: 'var(--mono)' }}>{showR2 ? '▲' : '▼'}</span>
        </button>

        <button
          onClick={handleSyncDecks}
          disabled={syncing}
          style={{ background: 'none', border: 'none', cursor: syncing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: 0, opacity: syncing ? 0.6 : 1 }}
        >
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--accent)' }}>
            {syncing ? 'SYNCING…' : 'SYNC DECKS'}
          </span>
        </button>

        {syncResult && !syncResult.error && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: syncResult.added > 0 ? '#10b981' : 'var(--muted)' }}>
            {syncResult.added > 0
              ? `+${syncResult.added} imported (${syncResult.skipped} already synced)`
              : `All ${syncResult.total} deck${syncResult.total !== 1 ? 's' : ''} already synced`}
          </span>
        )}
        {syncResult?.error && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#f87171' }}>Sync failed</span>
        )}
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
      <GatingPanel
        unlocks={item.unlocks ?? []}
        cohorts={cohorts}
        noun="content item"
        allowCohortWide
        onLock={(cohortId, squadId) => lockContentItem(item.id, cohortId, squadId)}
        onUnlock={(cohortId, squadId) => unlockContentItem(item.id, cohortId, squadId)}
        onUnlocksChange={(unlocks) => onUpdated({ ...item, unlocks })}
      />
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
    getScenarios(true).then((d) => setPackages(Array.isArray(d) ? d : [])).catch(() => setPackages([]));
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
  const [selected,    setSelected]    = useState(null);
  const [localItems,  setLocalItems]  = useState(contentItems);
  const [showPicker,  setShowPicker]  = useState(false);
  const [busy,        setBusy]        = useState({});

  useEffect(() => { setLocalItems(contentItems); }, [contentItems]);
  useEffect(() => { setShowPicker(false); }, [selected?.id]);

  const linkedSlides   = selected ? localItems.filter((ci) => ci.linked_assignment_id === selected.id) : [];
  const availableDecks = localItems.filter((ci) => !ci.linked_assignment_id);

  const handleLink = async (ci) => {
    setBusy((b) => ({ ...b, [ci.id]: true }));
    try {
      await updateContentItem(ci.id, { linked_assignment_id: selected.id, is_published: true });
      setLocalItems((prev) => prev.map((x) => x.id === ci.id ? { ...x, linked_assignment_id: selected.id, is_published: true } : x));
    } catch { /* ignore */ } finally {
      setBusy((b) => ({ ...b, [ci.id]: false }));
    }
  };

  const handleUnlink = async (ci) => {
    setBusy((b) => ({ ...b, [ci.id]: true }));
    try {
      await updateContentItem(ci.id, { linked_assignment_id: null });
      setLocalItems((prev) => prev.map((x) => x.id === ci.id ? { ...x, linked_assignment_id: null } : x));
    } catch { /* ignore */ } finally {
      setBusy((b) => ({ ...b, [ci.id]: false }));
    }
  };

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
              unlocks={selected.unlocks ?? []}
              cohorts={cohorts}
              onLock={(cohortId, squadId) => lockAssignment(selected.id, cohortId, squadId)}
              onUnlock={(cohortId, squadId) => unlockAssignment(selected.id, cohortId, squadId)}
              onUnlocksChange={(unlocks) => {
                setSelected((s) => ({ ...s, unlocks }));
                onUnlocksChange(selected.id, unlocks);
              }}
            />

            {/* ── Linked slide decks ── */}
            <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)', marginBottom: 10 }}>
                LINKED SLIDE DECKS
              </div>

              {linkedSlides.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                  No slide decks linked. Add one below — it will auto-unlock with this module.
                </p>
              )}

              {linkedSlides.map((ci) => (
                <div key={ci.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '5px 8px', marginBottom: 4,
                  background: 'rgba(0,176,255,0.05)',
                  border: '1px solid rgba(0,176,255,0.15)',
                  borderRadius: 4,
                }}>
                  <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.1em', flexShrink: 0 }}>
                    {CONTENT_TYPE_LABELS[ci.content_type] ?? ci.content_type}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--bright)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.title}</span>
                  <span style={{ fontSize: 9, color: '#10b981', flexShrink: 0 }}>LIVE</span>
                  <button
                    onClick={() => handleUnlink(ci)}
                    disabled={busy[ci.id]}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: 11, padding: '0 2px', flexShrink: 0 }}
                    title="Unlink from this module"
                  >
                    {busy[ci.id] ? '…' : '✕'}
                  </button>
                </div>
              ))}

              {/* Add deck picker */}
              <button
                onClick={() => setShowPicker((b) => !b)}
                style={{ marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}
              >
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--accent)' }}>
                  {showPicker ? '▲ CANCEL' : '+ ADD SLIDE DECK'}
                </span>
              </button>

              {showPicker && (
                <div style={{ marginTop: 8, maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
                  {availableDecks.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--muted)', padding: '10px 12px' }}>
                      No unlinked slide decks available. Use <strong>SYNC DECKS</strong> in the Intel Library tab to import from R2.
                    </p>
                  ) : availableDecks.map((ci) => (
                    <div key={ci.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.1em', flexShrink: 0 }}>
                        {CONTENT_TYPE_LABELS[ci.content_type] ?? ci.content_type}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.title}</span>
                      <button
                        onClick={() => handleLink(ci)}
                        disabled={busy[ci.id]}
                        className="btn-sm-primary"
                        style={{ flexShrink: 0, fontSize: 10 }}
                      >
                        {busy[ci.id] ? '…' : 'Link'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
  const [victimDraft,  setVictimDraft]  = useState('');
  const [debriefDraft, setDebriefDraft] = useState('');

  useEffect(() => { setLocalItems(assignments); }, [assignments]);
  useEffect(() => { setVictimDraft(selected?.victim_name ?? ''); }, [selected?.id]);
  useEffect(() => { setDebriefDraft(selected?.debrief ?? ''); }, [selected?.id]);

  // Scenario is the top level (null → '__unassigned__'). Within a scenario,
  // squad-graded challenges branch by victim; individual, role-filtered
  // challenges branch by professional role instead (victim and role are
  // separate dimensions — a challenge is either squad/victim work or
  // individual role work, not nested one inside the other). Anything with
  // neither a victim nor a role falls into a residual "shared" bucket.
  const scenarioMap = new Map(); // scenarioKey → { victims: Map, roles: Map, shared: [] }
  for (const a of localItems) {
    const sKey = a.scenario_name ?? '__unassigned__';
    if (!scenarioMap.has(sKey)) scenarioMap.set(sKey, { victims: new Map(), roles: new Map(), shared: [] });
    const group = scenarioMap.get(sKey);
    if (a.victim_name) {
      if (!group.victims.has(a.victim_name)) group.victims.set(a.victim_name, []);
      group.victims.get(a.victim_name).push(a);
    } else if (a.role_filters?.length > 0) {
      for (const role of a.role_filters) {
        if (!group.roles.has(role)) group.roles.set(role, []);
        group.roles.get(role).push(a);
      }
    } else {
      group.shared.push(a);
    }
  }
  const scenarioGroups = [...scenarioMap.entries()].sort(([a], [b]) => {
    if (a === '__unassigned__') return 1;
    if (b === '__unassigned__') return -1;
    return a.localeCompare(b);
  });
  for (const [sKey, group] of scenarioGroups) {
    for (const items of group.victims.values()) items.sort((a, b) => a.order_index - b.order_index);
    for (const items of group.roles.values())   items.sort((a, b) => a.order_index - b.order_index);
    group.shared.sort((a, b) => a.order_index - b.order_index);
  }

  const toggleGroup = (key) =>
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const renderSubgroup = (groupKey, label, items) => {
    const isOpen = !closedGroups.has(groupKey);
    return (
      <div key={groupKey}>
        <button
          className="admin-group-header"
          style={{ paddingLeft: 24, background: 'transparent', fontSize: 10, color: 'var(--muted)', letterSpacing: '.12em' }}
          onClick={() => toggleGroup(groupKey)}
        >
          <span style={{ flex: 1, textAlign: 'left' }}>{label.toUpperCase()}</span>
          <span className="admin-group-badge" style={{ fontSize: 9 }}>{items.length}</span>
          <span className="admin-group-chevron" style={{ fontSize: 9 }}>{isOpen ? '▲' : '▼'}</span>
        </button>
        {isOpen && items.map((a) => (
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
  };

  const handleFieldChange = async (assignmentId, patch) => {
    try {
      await updateAssignment(assignmentId, patch);
      setLocalItems((prev) => prev.map((a) => a.id === assignmentId ? { ...a, ...patch } : a));
      setSelected((s) => s?.id === assignmentId ? { ...s, ...patch } : s);
      onAssignmentsChange?.((prev) => prev.map((a) => a.id === assignmentId ? { ...a, ...patch } : a));
    } catch { /* ignore */ }
  };

  const toggleRole = (assignment, role) => {
    const current = assignment.role_filters ?? [];
    const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
    handleFieldChange(assignment.id, { role_filters: next });
  };

  return (
    <div className="admin-layout">
      <div className="admin-left">
        {localItems.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
            No challenges found.
          </p>
        )}
        {scenarioGroups.map(([sKey, group]) => {
          const sLabel  = scenarioLabel(sKey === '__unassigned__' ? null : sKey);
          const sCount  = localItems.filter((a) => (a.scenario_name ?? '__unassigned__') === sKey).length;
          const sIsOpen = !closedGroups.has(sKey);

          const victimEntries = [...group.victims.entries()].sort(([a], [b]) => a.localeCompare(b));
          const roleEntries   = [...group.roles.entries()].sort(([a], [b]) => {
            const ai = ROLE_ORDER.indexOf(a), bi = ROLE_ORDER.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });

          return (
            <div key={sKey}>
              <button className="admin-group-header" onClick={() => toggleGroup(sKey)}>
                <span className="admin-group-label">{sLabel}</span>
                <span className="admin-group-badge">{sCount}</span>
                <span className="admin-group-chevron">{sIsOpen ? '▲' : '▼'}</span>
              </button>
              {sIsOpen && (
                <>
                  {victimEntries.map(([vKey, items]) => renderSubgroup(`${sKey}::victim::${vKey}`, vKey, items))}
                  {roleEntries.map(([rKey, items]) => renderSubgroup(`${sKey}::role::${rKey}`, ROLE_LABELS[rKey] ?? rKey, items))}
                  {group.shared.length > 0 && renderSubgroup(`${sKey}::shared`, 'Shared / All Squads', group.shared)}
                </>
              )}
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
                  {selected.role_filters?.length > 0 && ` · ${selected.role_filters.map((r) => ROLE_LABELS[r] ?? r).join(', ')}`}
                </div>
              </div>
            </div>

            {/* ── Scenario + Victim + Role assignment ── */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)' }}>
                SCENARIO, VICTIM &amp; ROLE
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', width: 56 }}>Scenario:</label>
                <select
                  value={selected.scenario_name ?? ''}
                  onChange={(e) => handleFieldChange(selected.id, { scenario_name: e.target.value || null })}
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
                  value={victimDraft}
                  onChange={(e) => setVictimDraft(e.target.value)}
                  onBlur={() => handleFieldChange(selected.id, { victim_name: victimDraft.trim() || null })}
                  onKeyDown={(e) => e.key === 'Enter' && handleFieldChange(selected.id, { victim_name: victimDraft.trim() || null })}
                  placeholder="e.g. Redstone Memorial Hospital"
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', width: 56, flexShrink: 0, paddingTop: 2 }}>Roles:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                  {ROLE_ORDER.map((role) => (
                    <label key={role} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(selected.role_filters ?? []).includes(role)}
                        onChange={() => toggleRole(selected, role)}
                      />
                      {ROLE_LABELS[role]}
                    </label>
                  ))}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                Leave all roles unchecked to show this challenge to every professional role. Role and victim filters both apply if both are set — the list on the left groups by whichever one is set for simplicity, since in practice a challenge is normally one or the other.
              </p>
            </div>

            {/* ── Post-completion debrief ── */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', color: 'var(--primary)' }}>
                DEBRIEF (shown to students after they complete this challenge)
              </div>
              <textarea
                value={debriefDraft}
                onChange={(e) => setDebriefDraft(e.target.value)}
                onBlur={() => handleFieldChange(selected.id, { debrief: debriefDraft.trim() || null })}
                placeholder="Optional note shown on the results screen after submission — e.g. why this skill matters in the field."
                rows={4}
                style={{ padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
              />
            </div>

            <GatingPanel
              key={selected.id}
              unlocks={selected.unlocks ?? []}
              cohorts={cohorts}
              onLock={(cohortId, squadId) => lockAssignment(selected.id, cohortId, squadId)}
              onUnlock={(cohortId, squadId) => unlockAssignment(selected.id, cohortId, squadId)}
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
              unlocks={selected.unlocks ?? []}
              cohorts={cohorts}
              onLock={(cohortId, squadId) => lockAssignment(selected.id, cohortId, squadId)}
              onUnlock={(cohortId, squadId) => unlockAssignment(selected.id, cohortId, squadId)}
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

/* ── Live Progress ── */
const LIVE_STATUS_META = {
  in_progress: { label: 'Working',   color: '#2563eb' },
  submitted:   { label: 'Submitted', color: '#059669' },
  graded:      { label: 'Graded',    color: '#0d9488' },
  returned:    { label: 'Returned',  color: '#7c3aed' },
};

function relativeTime(iso) {
  if (!iso) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 5)    return 'just now';
  if (diffSec < 60)   return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60)   return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24)    return `${diffHr}h ago`;
  return `${Math.round(diffHr / 24)}d ago`;
}

function LiveRosterRow({ sub }) {
  const meta = LIVE_STATUS_META[sub.status] ?? { label: sub.status, color: 'var(--muted)' };
  const name = sub.student ? `${sub.student.first_name} ${sub.student.last_name}`.trim() : 'Unknown';
  return (
    <div className="live-roster-row">
      <div className="live-roster-name">
        {name}
        {sub.squad && <span className="live-roster-squad">Squad {sub.squad.number}</span>}
      </div>
      <div className="live-roster-bar-wrap">
        <div className="live-roster-bar-fill" style={{ width: `${sub.progress ?? 0}%`, background: meta.color }} />
      </div>
      <span className="live-roster-pct">{sub.progress ?? 0}%</span>
      {sub.performance && (
        <div className="live-roster-perf">
          <span className="live-roster-perf-acc">
            {sub.performance.correctCount}/{sub.performance.attemptedCount} correct
          </span>
          <span className="live-roster-perf-pts">
            {sub.performance.earnedPoints}/{sub.performance.maxScore} pts
          </span>
        </div>
      )}
      <span className="live-roster-status" style={{ color: meta.color, borderColor: meta.color }}>
        {sub.status === 'in_progress' && <span className="live-dot" style={{ background: meta.color }} />}
        {meta.label}
      </span>
      <span className="live-roster-time">{relativeTime(sub.updated_at)}</span>
    </div>
  );
}

const LIVE_POLL_MS = 10_000;

function LiveProgressPanel() {
  const [overview,      setOverview]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [roster,        setRoster]        = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const loadOverview = useCallback(() => {
    return getLiveOverview()
      .then((data) => setOverview(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const loadRoster = useCallback((assignmentId) => {
    return getAssignmentProgress(assignmentId)
      .then((data) => setRoster(Array.isArray(data) ? data : []))
      .catch(() => setRoster([]));
  }, []);

  // Poll the overview list continuously so in-progress counts and the "who's
  // active right now" badges stay current even before an assignment is opened.
  useEffect(() => {
    loadOverview().finally(() => setLoading(false));
    const t = setInterval(loadOverview, LIVE_POLL_MS);
    return () => clearInterval(t);
  }, [loadOverview]);

  // Poll the open roster faster than the overview — this is the "watch them
  // work" view, so it should feel closer to real-time.
  useEffect(() => {
    if (!selected) return;
    setRosterLoading(true);
    loadRoster(selected.id).finally(() => setRosterLoading(false));
    const t = setInterval(() => loadRoster(selected.id), LIVE_POLL_MS / 2);
    return () => clearInterval(t);
  }, [selected, loadRoster]);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const inProgressRoster = roster.filter((s) => s.status === 'in_progress');
  const completedRoster  = roster.filter((s) => s.status !== 'in_progress');

  return (
    <div className="admin-layout">
      <div className="admin-left">
        {overview.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 16px' }}>
            No published modules or challenges yet.
          </p>
        )}
        {overview.map((a) => {
          const color = TYPE_COLOR[a.type] ?? TYPE_COLOR.module;
          return (
            <button
              key={a.id}
              className={`admin-assign-btn${selected?.id === a.id ? ' active' : ''}`}
              onClick={() => setSelected(a)}
            >
              <span className="admin-assign-type" style={{ color }}>{a.type.toUpperCase()}</span>
              <span className="admin-assign-title">{a.title}</span>
              {a.inProgressCount > 0 && (
                <span className="live-badge">
                  <span className="live-dot" />
                  {a.inProgressCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="admin-right">
        {!selected ? (
          <div className="admin-empty">
            <p>Select a module or challenge to see who's actively working on it right now.</p>
          </div>
        ) : (
          <>
            <div className="admin-right-header">
              <div>
                <div className="admin-right-title">{selected.title}</div>
                <div className="admin-right-sub">{selected.type} · refreshes every {LIVE_POLL_MS / 2000}s</div>
              </div>
            </div>

            {rosterLoading && roster.length === 0 ? (
              <p style={{ padding: 16, color: 'var(--muted)' }}>Loading…</p>
            ) : roster.length === 0 ? (
              <div className="admin-empty"><p>No students have started this yet.</p></div>
            ) : (
              <div style={{ padding: '4px 20px 20px' }}>
                {inProgressRoster.length > 0 && (
                  <>
                    <div className="live-section-label">
                      <span className="live-dot" style={{ background: '#2563eb' }} />
                      ACTIVELY WORKING ({inProgressRoster.length})
                    </div>
                    <div className="live-roster">
                      {inProgressRoster.map((s) => <LiveRosterRow key={s.id} sub={s} />)}
                    </div>
                  </>
                )}
                {completedRoster.length > 0 && (
                  <>
                    <div className="live-section-label" style={{ marginTop: inProgressRoster.length > 0 ? 18 : 0 }}>
                      COMPLETED ({completedRoster.length})
                    </div>
                    <div className="live-roster">
                      {completedRoster.map((s) => <LiveRosterRow key={s.id} sub={s} />)}
                    </div>
                  </>
                )}
              </div>
            )}
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
  const [victimCode,   setVictimCode]   = useState('');
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

      // 1. Quick-release the scenario package to the cohort, tagged with its
      //    drop number + victim so releaseDrop() can fan it out to the right
      //    squad automatically on every future release of this drop.
      await quickReleaseScenario({
        cohort_id:     cohortId,
        r2_key:        folder.prefix,
        title:         title.trim(),
        description:   description.trim() || undefined,
        scenario_name: scenarioName.trim() || folder.name,
        drop_number:   dropNum,
        victim_code:   victimCode || null,
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

  const selectedVictim = Object.values(VICTIMS).find((v) => v.code === victimCode) ?? null;

  if (done) {
    return (
      <div style={{ padding: '10px 16px', color: '#10b981', fontSize: 13, fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>
        DROP RELEASED{selectedVictim ? ` — ${selectedVictim.code}` : ' — COHORT-WIDE (NO VICTIM)'}
        {cipher !== 'none' && ` + ${cipher === 'vault' ? 'VAULT LOCK' : 'SIGNAL HUNT'}`}
      </div>
    );
  }

  const squadColor = selectedVictim?.color ?? 'var(--primary)';

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

        {/* Victim */}
        <div className="form-field" style={{ margin: 0 }}>
          <label>
            Victim
            <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 11 }}> (routes to whichever squad is assigned this victim)</span>
          </label>
          <select value={victimCode} onChange={(e) => setVictimCode(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 4, border: `1.5px solid ${squadColor}66`, background: 'var(--surface)', color: squadColor, fontSize: 13, fontWeight: 600, width: '100%' }}>
            <option value="">Cohort-wide (no victim)</option>
            {Object.values(VICTIMS).map((v) => (
              <option key={v.code} value={v.code}>{v.code} — {v.name}</option>
            ))}
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
          {saving ? 'Dropping…' : `Release Drop${selectedVictim ? ` → ${selectedVictim.code}` : ' → Cohort-wide'}`}
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
        file_name:    file.name,
        file_size:    file.size ?? undefined,
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

/* Squad-level access control, reused for both assignments (lockAssignment/
   unlockAssignment) and course content items (lockContentItem/
   unlockContentItem) — the caller supplies which pair to call plus its own
   `unlocks` array ({cohort_id, squad_id}) and how to persist changes to it,
   so this component has no idea which kind of thing it's gating. */
function GatingPanel({ unlocks = [], cohorts, onUnlocksChange, onLock, onUnlock, noun = 'assignment', allowCohortWide = false }) {
  const [squadsByC,  setSquadsByC]  = useState({});   // cohortId → Squad[]
  const [loadingC,   setLoadingC]   = useState({});   // cohortId → bool
  const [busy,       setBusy]       = useState({});   // `${cohortId}:${squadId}` → bool
  const [errors,     setErrors]     = useState({});

  // Build sets from current unlock records for fast lookup
  const unlockedSquadIds = new Set(
    unlocks.filter((u) => u.squad_id).map((u) => u.squad_id)
  );
  const unlockedCohortIds = new Set(
    unlocks.filter((u) => !u.squad_id).map((u) => u.cohort_id)
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

  // squad === null means the cohort-wide toggle (only rendered when
  // allowCohortWide is set) — same unlock row shape either way, just with
  // squad_id: null instead of a specific squad's id.
  const toggle = async (cohort, squad) => {
    const squadId  = squad?.id ?? null;
    const key      = `${cohort.id}:${squadId ?? 'cohort'}`;
    const unlocked = squadId ? unlockedSquadIds.has(squadId) : unlockedCohortIds.has(cohort.id);
    setBusy((b)   => ({ ...b, [key]: true }));
    setErrors((e) => ({ ...e, [key]: null }));
    try {
      if (unlocked) {
        await onLock(cohort.id, squadId);
        onUnlocksChange(unlocks.filter((u) => !(u.cohort_id === cohort.id && (u.squad_id ?? null) === squadId)));
      } else {
        await onUnlock(cohort.id, squadId);
        onUnlocksChange([...unlocks, { cohort_id: cohort.id, squad_id: squadId }]);
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
        Control which squads can access this {noun}. Select individual squads across cohorts.
      </p>
      {cohorts.map((cohort) => {
        const squads = squadsByC[cohort.id] ?? [];
        const loading = loadingC[cohort.id];
        const cohortWide = unlockedCohortIds.has(cohort.id);
        return (
          <div key={cohort.id} className="admin-gating-cohort">
            <div className="admin-gating-cohort-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1 }}>
                {cohort.name}
                {cohortWide && !allowCohortWide && (
                  <span className="admin-gating-badge badge-unlocked" style={{ marginLeft: 8, fontSize: 10 }}>All unlocked (legacy)</span>
                )}
              </span>
              {allowCohortWide && (
                <button
                  className={`admin-gate-btn ${cohortWide ? 'gate-lock' : 'gate-unlock'}`}
                  onClick={() => toggle(cohort, null)}
                  disabled={busy[`${cohort.id}:cohort`]}
                  title="Unlock/lock this content for every squad in the cohort at once"
                >
                  {busy[`${cohort.id}:cohort`] ? '…' : cohortWide ? 'Lock Cohort' : 'Unlock Cohort'}
                </button>
              )}
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
  const parsed    = parseContent(sub.content);
  const isSquad   = assignment.grading_mode === 'squad';
  const maxScore  = parseFloat(assignment.max_score ?? 100);

  const handleSaved = (result) => {
    setSavedGrade(result);
    onGradeSaved(result);
  };

  const isDeliverable = parsed.type === 'deliverable';

  return (
    <div className="admin-detail">
      {/* Student / squad info */}
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
        {savedGrade != null && (
          <div className="admin-grade-chip" style={{ marginLeft: 'auto', color: '#10b981', fontSize: 15 }}>
            {savedGrade.score}/{maxScore}
          </div>
        )}
      </div>

      {/* Quiz auto-grade review (no separate grade form needed) */}
      {parsed.type === 'quiz' && (
        <div className="admin-content-box">
          <div className="section-label" style={{ marginBottom: 12 }}>Assessment Results</div>
          <QuizAnswerReview quizData={parsed.data} questions={assignment.questions ?? []} />
        </div>
      )}

      {/* Deliverable rubric review + per-prompt grading (replaces grade form) */}
      {isDeliverable && (
        <div className="admin-content-box">
          <div className="section-label" style={{ marginBottom: 16 }}>
            Rubric Review &amp; Grading
            {assignment.victim_name && (
              <span style={{ marginLeft: 10, fontFamily: 'var(--mono)', fontSize: 9, color: '#f87171', letterSpacing: '.1em' }}>
                {assignment.victim_name.toUpperCase()}
              </span>
            )}
          </div>
          <ChallengeDeliverableReview
            delivData={parsed.data}
            questions={assignment.questions ?? []}
            maxScore={maxScore}
            assignmentId={assignment.id}
            userId={sub.user_id}
            squadId={sub.squad_id}
            isSquad={isSquad}
            existingGrade={savedGrade}
            onGradeSaved={handleSaved}
          />
        </div>
      )}

      {/* Free-text submission + standard grade form */}
      {parsed.type === 'text' && (
        <>
          <div className="admin-content-box">
            <div className="section-label" style={{ marginBottom: 12 }}>Submission</div>
            <pre className="admin-text-content">{parsed.data || '(no content)'}</pre>
          </div>
          <div className="admin-content-box">
            <div className="section-label" style={{ marginBottom: 12 }}>
              {savedGrade ? 'Update Grade' : 'Grade Submission'}
            </div>
            <GradeForm
              assignmentId={assignment.id}
              userId={sub.user_id}
              squadId={sub.squad_id}
              isSquad={isSquad}
              maxScore={maxScore}
              existingGrade={savedGrade}
              onSaved={handleSaved}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAMPAIGN DROPS PANEL
═══════════════════════════════════════════════════════════ */

function DropFormInline({ initial, defaultScenario, onSave, onCancel }) {
  const [form, setForm] = useState({
    number:          initial?.number          ?? '',
    title:           initial?.title           ?? '',
    scenario_name:   initial?.scenario_name   ?? defaultScenario ?? '',
    narrative_intro: initial?.narrative_intro ?? '',
    vault_hint:      initial?.vault_hint      ?? '',
    vault_pin:       initial?.vault_pin       ?? '',
    html_signal:     initial?.html_signal     ?? '',
    signal_prompt:   initial?.signal_prompt   ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(
    !!(initial?.vault_hint || initial?.vault_pin || initial?.html_signal || initial?.signal_prompt)
  );
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.number || !form.title.trim()) { setErr('Drop number and title are required.'); return; }
    setSaving(true);
    setErr('');
    try {
      const payload = { ...form, number: Number(form.number) };
      const saved = initial ? await updateCampaignDrop(initial.id, payload) : await createCampaignDrop(payload);
      onSave(saved);
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
        <label className="admin-grade-label">Scenario</label>
        <select value={form.scenario_name} onChange={set('scenario_name')} style={{ width: '100%' }}>
          <option value="">— Unassigned —</option>
          {KNOWN_SCENARIOS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--muted)' }}>
          Must match the scenario value challenges use (e.g. "packet-heist") — not the R2 folder display name.
        </p>
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
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8,
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--primary)', letterSpacing: '.06em',
        }}
      >
        {advancedOpen ? '− Hide advanced: Vault Lock & Signal Hunt' : '+ Advanced: Vault Lock & Signal Hunt'}
      </button>
      {advancedOpen && (
        <>
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
        </>
      )}
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
  const matched = scenarios.filter((s) => s.drop_number === dropNumber);
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

/* Type-to-search chip picker — replaces long always-visible checkbox lists.
   candidates: [{ id, label }] excluding already-selected items is NOT
   required of the caller; this component filters selected out itself. */
function SearchPickerField({ candidates, selectedIds, busyIds, onAdd, onRemove, placeholder, emptyLabel }) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);

  const selected = candidates.filter((c) => selectedIds.includes(c.id));
  const pool     = candidates.filter((c) => !selectedIds.includes(c.id));
  const filtered = (query.trim()
    ? pool.filter((c) => c.label.toLowerCase().includes(query.trim().toLowerCase()))
    : pool
  ).slice(0, 8);

  return (
    <div>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
          {selected.map((c) => (
            <span key={c.id} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 6px 3px 9px', borderRadius: 12, fontSize: 12,
              background: 'rgba(0,176,255,0.1)', border: '1px solid rgba(0,176,255,0.3)', color: 'var(--text)',
            }}>
              {c.label}
              <button
                onClick={() => onRemove(c)}
                disabled={busyIds?.has(c.id)}
                title="Remove"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1,
                  color: 'var(--muted)', fontSize: 14,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          style={{ width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        />
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,.15)', marginTop: 2, maxHeight: 180, overflowY: 'auto',
          }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--muted)' }}>{emptyLabel ?? 'No matches.'}</div>
            ) : filtered.map((c) => (
              <button
                key={c.id}
                onMouseDown={() => { onAdd(c); setQuery(''); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2, #f8fafc)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const DROP_VICTIM_ROWS = Object.values(VICTIMS).map((v) => ({ key: v.code, label: v.code, victimName: v.name, victimCode: v.code }));
const DROP_ROLE_ROWS   = ROLE_ORDER.map((role) => ({ key: role, label: ROLE_LABELS[role] }));

function CampaignDropsPanel({ cohorts, assignments = [], contentItems = [], onAssignmentsChange, onContentPublished }) {
  const [drops,     setDrops]    = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [cohortId,  setCohortId] = useState(() => cohorts[0]?.id ?? '');
  const [delDrop,   setDelDrop]  = useState(null);
  const [working,   setWorking]  = useState(null);
  const [err,       setErr]      = useState('');
  const [warn,      setWarn]     = useState('');
  const [manageDrop,  setManageDrop]  = useState(null); // null | drop | { isNew: true }
  const [manageTab,   setManageTab]   = useState('basics'); // 'basics' | 'pair'
  const [pairSubTab,  setPairSubTab]  = useState('squad');  // 'squad' | 'role' | 'shared'
  const [localContent, setLocalContent] = useState(contentItems);
  const [pairing,      setPairing]      = useState({}); // key -> bool

  const openNewDrop = () => { setManageDrop({ isNew: true }); setManageTab('basics'); };
  const openManage  = (drop) => { setManageDrop(drop); setManageTab('pair'); setPairSubTab('squad'); };
  const closeManage = () => setManageDrop(null);

  useEffect(() => { setLocalContent(contentItems); }, [contentItems]);

  const challengeItems = assignments.filter((a) => a.type === 'challenge');

  const applyAssignmentPatch = async (assignment, patch) => {
    const key = `a:${assignment.id}`;
    setPairing((p) => ({ ...p, [key]: true }));
    try {
      await updateAssignment(assignment.id, patch);
      onAssignmentsChange?.((prev) => prev.map((a) => a.id === assignment.id ? { ...a, ...patch } : a));
    } catch { /* ignore */ }
    finally { setPairing((p) => ({ ...p, [key]: false })); }
  };

  // Victim rows are squad work — mutually exclusive with role filtering, so
  // adding a victim clears any role_filters the challenge had.
  const addAssignmentVictim    = (a, drop, victimName) => applyAssignmentPatch(a, { drop_number: drop.number, victim_name: victimName, role_filters: [] });
  const removeAssignmentVictim = (a)                    => applyAssignmentPatch(a, { drop_number: null, victim_name: null });

  // Role rows are individual work — role_filters is multi-select, so add/remove
  // only touch the one role rather than replacing the whole array.
  const addAssignmentRole = (a, drop, role) => {
    const current = (a.drop_number === drop.number && !a.victim_name) ? (a.role_filters ?? []) : [];
    return applyAssignmentPatch(a, { drop_number: drop.number, victim_name: null, role_filters: [...current, role] });
  };
  const removeAssignmentRole = (a, role) => {
    const nextRoles = (a.role_filters ?? []).filter((r) => r !== role);
    return applyAssignmentPatch(a, { role_filters: nextRoles });
  };

  const addAssignmentShared    = (a, drop) => applyAssignmentPatch(a, { drop_number: drop.number, victim_name: null, role_filters: [] });
  const removeAssignmentShared = (a)       => applyAssignmentPatch(a, { drop_number: null, victim_name: null, role_filters: [] });

  const applyContentPatch = async (item, patch) => {
    const key = `c:${item.id}`;
    setPairing((p) => ({ ...p, [key]: true }));
    try {
      await updateContentItem(item.id, patch);
      setLocalContent((prev) => prev.map((c) => c.id === item.id ? { ...c, ...patch } : c));
      onContentPublished?.();
    } catch { /* ignore */ }
    finally { setPairing((p) => ({ ...p, [key]: false })); }
  };
  const addContentItem    = (c, drop, victimCode) => applyContentPatch(c, { drop_number: drop.number, victim_code: victimCode ?? null });
  const removeContentItem = (c)                   => applyContentPatch(c, { drop_number: null, victim_code: null });

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    Promise.all([
      getCampaignDrops(cohortId || undefined),
      scenarios.length === 0 ? getScenarios(true) : Promise.resolve(scenarios),
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
    setWarn('');
    try {
      const result = await releaseCampaignDrop(drop.id, cohortId);
      if (result?.skipped_squads?.length > 0) {
        setWarn(`Squad${result.skipped_squads.length > 1 ? 's' : ''} ${result.skipped_squads.join(', ')} skipped — no victim assigned yet. Set it in Command Center.`);
      }
      load();
    }
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
            Create drops, pair their challenges and case files, and release to cohorts.
          </p>
        </div>
        <button className="btn-submit" style={{ width: 'auto', flexShrink: 0 }} onClick={openNewDrop}>
          + New Drop
        </button>
      </div>

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
      {warn && (
        <div style={{
          marginBottom: 10, padding: '8px 12px', borderRadius: 6,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
          color: '#b45309', fontSize: 13,
        }}>
          {warn}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" /></div>
      ) : drops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 13 }}>
          No drops yet. Create the first one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...drops].sort((a, b) => a.number - b.number).map((drop) => {
            const isUnlocked = drop.is_unlocked;
            const isWorking  = !!working?.startsWith(drop.id);
            return (
              <div
                key={drop.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                  border: `1px solid ${isUnlocked ? 'var(--primary)' : 'var(--border)'}`,
                  borderLeft: `4px solid ${isUnlocked ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 8, background: 'var(--surface, #fff)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  padding: '2px 8px', borderRadius: 4, flexShrink: 0,
                  background: isUnlocked ? 'var(--primary)' : 'var(--surface-2, #f1f5f9)',
                  color:      isUnlocked ? '#fff' : 'var(--muted)',
                }}>
                  DROP {drop.number}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drop.title}</div>
                  {drop.scenario_name && (
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '.06em' }}>
                      {scenarioLabel(drop.scenario_name)}
                    </div>
                  )}
                </div>
                {isUnlocked && cohortId && (
                  <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600, flexShrink: 0 }}>● RELEASED</span>
                )}
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
                    onClick={() => openManage(drop)}
                  >
                    Manage
                  </button>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 16, lineHeight: 1, padding: '4px 6px' }}
                    disabled={isWorking}
                    onClick={() => setDelDrop(drop)}
                    title="Delete drop"
                  >✕</button>
                </div>
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

      {/* Manage modal — basics + pairing, decoupled from release */}
      {manageDrop && (() => {
        const isNew = !!manageDrop.isNew;
        const drop  = isNew ? null : manageDrop;
        const scenarioChallenges = drop ? challengeItems.filter((a) => a.scenario_name === drop.scenario_name) : [];

        return (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) closeManage(); }}
          >
            <div style={{
              background: 'var(--surface, #fff)', borderRadius: 10, width: '92%', maxWidth: 760,
              maxHeight: '86vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,.25)',
            }}>
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
                  {isNew ? 'New Drop' : `Drop ${drop.number} — ${drop.title}`}
                </div>
                <button
                  onClick={closeManage}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: 'var(--muted)', padding: 4 }}
                  title="Close"
                >×</button>
              </div>

              {/* Step tabs */}
              {!isNew && (
                <div style={{ display: 'flex', gap: 4, padding: '8px 18px 0', flexShrink: 0 }}>
                  {[['basics', 'Basics'], ['pair', 'Pair Content']].map(([key, label]) => (
                    <button
                      key={key}
                      className={`scenario-tab${manageTab === key ? ' active' : ''}`}
                      onClick={() => setManageTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ overflowY: 'auto', padding: '14px 18px', flex: 1 }}>
                {manageTab === 'basics' && (
                  <DropFormInline
                    initial={drop}
                    onSave={(saved) => { load(); setManageDrop(saved); setManageTab('pair'); setPairSubTab('squad'); }}
                    onCancel={closeManage}
                  />
                )}

                {manageTab === 'pair' && drop && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {!drop.scenario_name && (
                      <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>
                        This drop has no scenario set — set it on the Basics tab so candidate challenges can be filtered correctly.
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 4 }}>
                      {[['squad', 'Squad / Victim'], ['role', 'Individual / Role'], ['shared', 'Shared']].map(([key, label]) => (
                        <button
                          key={key}
                          className={`scenario-tab${pairSubTab === key ? ' active' : ''}`}
                          onClick={() => setPairSubTab(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {pairSubTab === 'squad' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {DROP_VICTIM_ROWS.map((row) => {
                          const challengeCandidates = scenarioChallenges
                            .filter((a) => a.drop_number == null || (a.drop_number === drop.number && a.victim_name === row.victimName))
                            .map((a) => ({ id: a.id, label: a.title, ref: a }));
                          const challengeSelected = scenarioChallenges
                            .filter((a) => a.drop_number === drop.number && a.victim_name === row.victimName)
                            .map((a) => a.id);
                          const contentCandidates = localContent
                            .filter((c) => c.drop_number == null || (c.drop_number === drop.number && c.victim_code === row.victimCode))
                            .map((c) => ({ id: c.id, label: c.title, ref: c }));
                          const contentSelected = localContent
                            .filter((c) => c.drop_number === drop.number && c.victim_code === row.victimCode)
                            .map((c) => c.id);
                          return (
                            <div key={row.key}>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase' }}>
                                {row.label}
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: '.06em' }}>CHALLENGES</div>
                                  <SearchPickerField
                                    candidates={challengeCandidates}
                                    selectedIds={challengeSelected}
                                    busyIds={new Set(Object.keys(pairing).filter((k) => pairing[k]).map((k) => k.slice(2)))}
                                    onAdd={(c) => addAssignmentVictim(c.ref, drop, row.victimName)}
                                    onRemove={(c) => removeAssignmentVictim(c.ref)}
                                    placeholder="Search challenges…"
                                    emptyLabel="No unpaired challenges for this scenario."
                                  />
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: '.06em' }}>CASE FILES</div>
                                  <SearchPickerField
                                    candidates={contentCandidates}
                                    selectedIds={contentSelected}
                                    busyIds={new Set(Object.keys(pairing).filter((k) => pairing[k]).map((k) => k.slice(2)))}
                                    onAdd={(c) => addContentItem(c.ref, drop, row.victimCode)}
                                    onRemove={(c) => removeContentItem(c.ref)}
                                    placeholder="Search case files…"
                                    emptyLabel="No unpaired case files."
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {pairSubTab === 'role' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                          A challenge can be added under multiple roles. Adding a challenge to any role clears its victim — role work and squad work are separate.
                        </p>
                        {DROP_ROLE_ROWS.map((row) => {
                          const candidates = scenarioChallenges
                            .filter((a) => !a.victim_name && (a.drop_number == null || a.drop_number === drop.number))
                            .map((a) => ({ id: a.id, label: a.title, ref: a }));
                          const selected = scenarioChallenges
                            .filter((a) => a.drop_number === drop.number && (a.role_filters ?? []).includes(row.key))
                            .map((a) => a.id);
                          return (
                            <div key={row.key}>
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase' }}>
                                {row.label}
                              </div>
                              <SearchPickerField
                                candidates={candidates}
                                selectedIds={selected}
                                busyIds={new Set(Object.keys(pairing).filter((k) => pairing[k]).map((k) => k.slice(2)))}
                                onAdd={(c) => addAssignmentRole(c.ref, drop, row.key)}
                                onRemove={(c) => removeAssignmentRole(c.ref, row.key)}
                                placeholder="Search individual challenges…"
                                emptyLabel="No unpaired individual challenges for this scenario."
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {pairSubTab === 'shared' && (() => {
                      const challengeCandidates = scenarioChallenges
                        .filter((a) => a.drop_number == null || (a.drop_number === drop.number && !a.victim_name && (a.role_filters?.length ?? 0) === 0))
                        .map((a) => ({ id: a.id, label: a.title, ref: a }));
                      const challengeSelected = scenarioChallenges
                        .filter((a) => a.drop_number === drop.number && !a.victim_name && (a.role_filters?.length ?? 0) === 0)
                        .map((a) => a.id);
                      const contentCandidates = localContent
                        .filter((c) => c.drop_number == null || (c.drop_number === drop.number && !c.victim_code))
                        .map((c) => ({ id: c.id, label: c.title, ref: c }));
                      const contentSelected = localContent
                        .filter((c) => c.drop_number === drop.number && !c.victim_code)
                        .map((c) => c.id);
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: '.06em' }}>CHALLENGES</div>
                            <SearchPickerField
                              candidates={challengeCandidates}
                              selectedIds={challengeSelected}
                              busyIds={new Set(Object.keys(pairing).filter((k) => pairing[k]).map((k) => k.slice(2)))}
                              onAdd={(c) => addAssignmentShared(c.ref, drop)}
                              onRemove={(c) => removeAssignmentShared(c.ref)}
                              placeholder="Search challenges…"
                              emptyLabel="No unpaired challenges for this scenario."
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: '.06em' }}>CASE FILES</div>
                            <SearchPickerField
                              candidates={contentCandidates}
                              selectedIds={contentSelected}
                              busyIds={new Set(Object.keys(pairing).filter((k) => pairing[k]).map((k) => k.slice(2)))}
                              onAdd={(c) => addContentItem(c.ref, drop, null)}
                              onRemove={(c) => removeContentItem(c.ref)}
                              placeholder="Search case files…"
                              emptyLabel="No unpaired case files."
                            />
                          </div>
                        </div>
                      );
                    })()}

                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                      Case files aren't tagged to a scenario in the database, so their candidate lists show every unpaired case file regardless of scenario — use the title to pick the right one.
                    </p>

                    <ScenarioIntelPanel scenarios={scenarios} dropNumber={drop.number} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
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
          <div className="section-label" style={{ marginBottom: 8 }}>Access</div>
          <GatingPanel
            unlocks={item.unlocks ?? []}
            cohorts={cohorts}
            noun="content item"
            allowCohortWide
            onLock={(cohortId, squadId) => lockContentItem(item.id, cohortId, squadId)}
            onUnlock={(cohortId, squadId) => unlockContentItem(item.id, cohortId, squadId)}
            onUnlocksChange={(unlocks) => onUpdated({ ...item, unlocks })}
          />
          {err && <div className="err-msg" style={{ marginTop: 8 }}>{err}</div>}
        </>
      )}
    </div>
  );
}
