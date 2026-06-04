import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getCourses, getCourseAnalytics, getCourseEffectiveness } from '../../api/courses.js';
import { listCohorts } from '../../api/cohorts.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

/* ── Helpers ── */
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

const gradeColor = (p) =>
  p == null    ? 'var(--text-muted)'
  : p >= 80    ? 'var(--success)'
  : p >= 60    ? 'var(--warning)'
  :              'var(--danger)';

const gradeBg = (p) =>
  p == null    ? 'var(--border)'
  : p >= 80    ? 'var(--success-bg)'
  : p >= 60    ? 'var(--warning-bg)'
  :              'var(--danger-bg)';

function Bar({ value, max, color = 'var(--accent)', height = 8 }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: 'var(--border)', borderRadius: 999, height, overflow: 'hidden', flex: 1 }}>
      <div style={{ width: `${w}%`, background: color, height: '100%', borderRadius: 999, transition: 'width .4s' }} />
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140 }}>
      <div className="card-body" style={{ textAlign: 'center', padding: '20px 16px' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: color ?? 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, children, action }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Assignment difficulty table ── */
function AssignmentPerformance({ assignments }) {
  const sorted = [...assignments].sort((a, b) => (a.avgPct ?? 101) - (b.avgPct ?? 101));
  const maxEnrolled = Math.max(...assignments.map((a) => a.enrolledCount), 1);

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Assignment</th>
              <th style={{ width: 90, textAlign: 'center' }}>Submitted</th>
              <th style={{ width: 90, textAlign: 'center' }}>Graded</th>
              <th style={{ width: 160 }}>Avg Score</th>
              <th style={{ width: 80, textAlign: 'center' }}>Avg %</th>
              <th style={{ width: 80, textAlign: 'right' }}>Range</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const color = gradeColor(a.avgPct);
              return (
                <tr key={a.assignmentId}>
                  <td className="fw-600" style={{ fontSize: 13 }}>{a.title}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 13 }}>{a.submittedCount}</span>
                    <span className="text-xs text-muted"> /{a.enrolledCount}</span>
                    {a.submissionRate < 50 && (
                      <span title="Low submission rate" style={{ marginLeft: 4, color: 'var(--warning)', fontSize: 11 }}>⚠</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 13 }}>{a.gradedCount}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bar value={a.avgScore ?? 0} max={a.maxScore} color={color} />
                      <span style={{ fontSize: 12, width: 48, textAlign: 'right', flexShrink: 0 }}>
                        {a.avgScore != null ? `${a.avgScore}/${a.maxScore}` : '—'}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {a.avgPct != null
                      ? <span style={{ fontWeight: 700, color, fontSize: 13 }}>{a.avgPct}%</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                    {a.minScore != null ? `${a.minScore}–${a.maxScore2}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Grade distribution histogram ── */
function GradeDistribution({ dist, totalStudents }) {
  const bands = [
    { label: 'A', range: '90–100%', key: 'A', color: 'var(--success)' },
    { label: 'B', range: '80–89%',  key: 'B', color: '#22c55e' },
    { label: 'C', range: '70–79%',  key: 'C', color: 'var(--warning)' },
    { label: 'D', range: '60–69%',  key: 'D', color: '#f97316' },
    { label: 'F', range: '<60%',    key: 'F', color: 'var(--danger)' },
  ];
  const maxCount = Math.max(...bands.map((b) => dist[b.key]), 1);

  return (
    <div className="card">
      <div className="card-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bands.map((b) => {
            const count = dist[b.key];
            const share = pct(count, totalStudents);
            return (
              <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                  background: b.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13,
                }}>{b.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 72, flexShrink: 0 }}>{b.range}</div>
                <Bar value={count} max={maxCount} color={b.color} height={10} />
                <div style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, flexShrink: 0 }}>({share}%)</div>
              </div>
            );
          })}
        </div>
        {totalStudents === 0 && (
          <p className="text-muted text-sm" style={{ marginTop: 12 }}>No graded students yet.</p>
        )}
      </div>
    </div>
  );
}

/* ── At-risk student list ── */
function AtRiskStudents({ students, totalAssignments }) {
  const atRisk = students.filter((s) => s.isAtRisk)
    .sort((a, b) => (a.avgPct ?? -1) - (b.avgPct ?? -1));

  if (atRisk.length === 0) {
    return (
      <div className="card">
        <div className="card-body" style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--success)' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>✓</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>No at-risk students detected</div>
          <p className="text-xs text-muted" style={{ marginTop: 4 }}>All graded students are above 60% and have submitted ≥ 50% of assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Cohort</th>
              <th style={{ width: 100, textAlign: 'center' }}>Submitted</th>
              <th style={{ width: 90, textAlign: 'center' }}>Avg Grade</th>
              <th style={{ width: 120 }}>Issues</th>
            </tr>
          </thead>
          <tbody>
            {atRisk.map((s) => {
              const subRate   = totalAssignments > 0 ? pct(s.submittedCount, totalAssignments) : 100;
              const lowGrade  = s.avgPct !== null && s.avgPct < 60;
              const lowSubmit = subRate < 50;
              return (
                <tr key={s.userId}>
                  <td>
                    <div className="fw-600" style={{ fontSize: 13 }}>{s.lastName}, {s.firstName}</div>
                    <div className="text-xs text-muted">{s.email}</div>
                  </td>
                  <td className="text-sm text-muted">{s.cohortName ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: lowSubmit ? 'var(--danger)' : 'inherit', fontSize: 13 }}>
                      {s.submittedCount}/{totalAssignments}
                    </span>
                    <span className="text-xs text-muted"> ({subRate}%)</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {s.avgPct != null
                      ? <span style={{ fontWeight: 700, color: gradeColor(s.avgPct), fontSize: 13 }}>{s.avgPct}%</span>
                      : <span className="text-muted text-xs">Ungraded</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {lowGrade  && <span className="badge" style={{ background: 'var(--danger-bg)',  color: 'var(--danger)',  fontSize: 10 }}>Low grade</span>}
                      {lowSubmit && <span className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', fontSize: 10 }}>Missing work</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Cohort comparison ── */
function CohortComparison({ cohorts }) {
  if (cohorts.length < 2) return null;
  const maxPct = Math.max(...cohorts.map((c) => c.avgPct ?? 0), 1);

  return (
    <Section title="Cohort Comparison">
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cohort</th>
                <th style={{ width: 80, textAlign: 'center' }}>Students</th>
                <th style={{ width: 200 }}>Avg Grade</th>
                <th style={{ width: 120 }}>Submission Rate</th>
              </tr>
            </thead>
            <tbody>
              {[...cohorts].sort((a, b) => (b.avgPct ?? -1) - (a.avgPct ?? -1)).map((c) => (
                <tr key={c.cohortId}>
                  <td className="fw-600">{c.cohortName}</td>
                  <td style={{ textAlign: 'center' }}>{c.studentCount}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bar value={c.avgPct ?? 0} max={100} color={gradeColor(c.avgPct)} height={10} />
                      <span style={{ fontWeight: 700, color: gradeColor(c.avgPct), fontSize: 13, flexShrink: 0 }}>
                        {c.avgPct != null ? `${c.avgPct}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Bar value={c.submissionRate ?? 0} max={100} color="var(--accent)" height={8} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {c.submissionRate != null ? `${c.submissionRate}%` : '—'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  );
}

/* ── Course Effectiveness sub-components ── */

function EffectivenessKpi({ label, value, sub, color, warn }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 140, borderTop: warn ? '3px solid var(--warning)' : undefined }}>
      <div className="card-body" style={{ textAlign: 'center', padding: '18px 14px' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: color ?? 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: warn ? 'var(--warning)' : 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function EngagementFunnel({ assignments }) {
  const maxEnrolled = Math.max(...assignments.map((a) => a.enrolledCount), 1);
  return (
    <div className="card">
      <div className="card-body">
        <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
          Shows how many enrolled students submitted each assignment in sequence. A sharp drop signals a sticking point.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {assignments.map((a, i) => {
            const engColor = a.engagementRate >= 80 ? 'var(--success)'
              : a.engagementRate >= 50 ? 'var(--warning)' : 'var(--danger)';
            return (
              <div key={a.assignmentId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, flexShrink: 0, color: 'var(--text-muted)' }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 12, width: 180, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={a.title}>{a.title}</div>
                <Bar value={a.submittedCount} max={maxEnrolled} color={engColor} height={12} />
                <span style={{ fontSize: 12, fontWeight: 700, color: engColor, width: 40, textAlign: 'right', flexShrink: 0 }}>
                  {a.engagementRate}%
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 60, flexShrink: 0 }}>
                  {a.submittedCount}/{a.enrolledCount}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScoreProgression({ assignments }) {
  const ordered = [...assignments].sort((a, b) => a.orderIndex - b.orderIndex);
  const hasPcts = ordered.some((a) => a.avgPct !== null);
  if (!hasPcts) return <div className="card"><div className="card-body"><p className="text-muted text-sm">No graded data yet.</p></div></div>;

  return (
    <div className="card">
      <div className="card-body">
        <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
          Average score % per assignment in order. Rising trend = students improving; falling = course getting harder or students disengaging.
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
          {ordered.map((a, i) => {
            const h   = a.avgPct != null ? Math.max(4, Math.round(a.avgPct)) : 0;
            const col = a.avgPct == null ? 'var(--border)' : gradeColor(a.avgPct);
            return (
              <div key={a.assignmentId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 3 }}
                title={`${a.title}: ${a.avgPct != null ? a.avgPct + '%' : 'no data'}`}>
                <span style={{ fontSize: 10, color: col, fontWeight: 600 }}>
                  {a.avgPct != null ? `${a.avgPct}%` : ''}
                </span>
                <div style={{ width: '100%', maxWidth: 32, height: h, background: col, borderRadius: '3px 3px 0 0', minHeight: 4 }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{i + 1}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 6 }}>Assignment # (in course order)</p>
      </div>
    </div>
  );
}

function PassRateTable({ assignments }) {
  const sorted = [...assignments].sort((a, b) => (a.passRate ?? -1) - (b.passRate ?? -1));
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Assignment</th>
              <th style={{ width: 90, textAlign: 'center' }}>Graded</th>
              <th style={{ width: 160 }}>Pass Rate (≥ 60%)</th>
              <th style={{ width: 80, textAlign: 'center' }}>Grading %</th>
              <th style={{ width: 110, textAlign: 'right' }}>Turnaround</th>
              <th style={{ width: 80, textAlign: 'center' }}>Backlog</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a) => {
              const prColor  = gradeColor(a.passRate);
              const grColor  = a.gradingRate != null ? (a.gradingRate >= 80 ? 'var(--success)' : a.gradingRate >= 50 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-muted)';
              const daysSince = a.oldestUngradedAt
                ? Math.floor((Date.now() - new Date(a.oldestUngradedAt).getTime()) / 86400000)
                : null;
              return (
                <tr key={a.assignmentId}>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.orderIndex + 1}</td>
                  <td className="fw-600" style={{ fontSize: 13 }}>{a.title}</td>
                  <td style={{ textAlign: 'center', fontSize: 13 }}>{a.gradedCount}</td>
                  <td>
                    {a.passRate != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Bar value={a.passRate} max={100} color={prColor} height={10} />
                        <span style={{ fontWeight: 700, color: prColor, fontSize: 13, flexShrink: 0 }}>{a.passRate}%</span>
                      </div>
                    ) : <span className="text-muted text-xs">No data</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {a.gradingRate != null
                      ? <span style={{ fontWeight: 600, color: grColor, fontSize: 13 }}>{a.gradingRate}%</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontSize: 12 }}>
                    {a.avgTurnaroundHours != null
                      ? <span style={{ color: a.avgTurnaroundHours > 48 ? 'var(--warning)' : 'inherit' }}>
                          {a.avgTurnaroundHours < 24
                            ? `${a.avgTurnaroundHours}h`
                            : `${(a.avgTurnaroundHours / 24).toFixed(1)}d`}
                        </span>
                      : <span className="text-muted">auto</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {a.ungradedCount > 0
                      ? <span style={{ fontWeight: 700, color: daysSince != null && daysSince > 7 ? 'var(--danger)' : 'var(--warning)', fontSize: 13 }}
                          title={daysSince != null ? `Oldest: ${daysSince}d ago` : undefined}>
                          {a.ungradedCount}
                        </span>
                      : <span style={{ color: 'var(--success)', fontSize: 13 }}>✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function AdminAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses,       setCourses]       = useState([]);
  const [cohorts,       setCohorts]       = useState([]);
  const [perfData,      setPerfData]      = useState(null);
  const [effectData,    setEffectData]    = useState(null);

  const [courseId,      setCourseId]      = useState(searchParams.get('course') ?? '');
  const [cohortId,      setCohortId]      = useState(searchParams.get('cohort') ?? '');
  const [activeTab,     setActiveTab]     = useState(searchParams.get('tab') ?? 'performance');

  const [loadingCourses,  setLoadingCourses]  = useState(true);
  const [loadingCohorts,  setLoadingCohorts]  = useState(false);
  const [loadingPerf,     setLoadingPerf]     = useState(false);
  const [loadingEffect,   setLoadingEffect]   = useState(false);
  const [error,           setError]           = useState('');

  useEffect(() => {
    getCourses({ limit: 200 })
      .then((d) => {
        const list = Array.isArray(d) ? d : (d.data ?? []);
        setCourses(list);
        if (!courseId && list.length > 0) setCourseId(list[0].id);
      })
      .catch(() => setError('Could not load courses.'))
      .finally(() => setLoadingCourses(false));
  }, []);

  useEffect(() => {
    if (!courseId) { setCohorts([]); setCohortId(''); setPerfData(null); setEffectData(null); return; }
    setLoadingCohorts(true);
    setCohortId('');
    setPerfData(null);
    setEffectData(null);
    listCohorts(courseId)
      .then((list) => { setCohorts(list); if (list.length === 1) setCohortId(list[0].id); })
      .catch(() => setCohorts([]))
      .finally(() => setLoadingCohorts(false));
  }, [courseId]);

  /* Load student-performance data */
  useEffect(() => {
    if (!courseId) return;
    setLoadingPerf(true);
    setError('');
    setPerfData(null);
    getCourseAnalytics(courseId, cohortId || null)
      .then(setPerfData)
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoadingPerf(false));
  }, [courseId, cohortId]);

  /* Load effectiveness data only when that tab is active */
  useEffect(() => {
    if (!courseId || activeTab !== 'effectiveness') return;
    setLoadingEffect(true);
    setEffectData(null);
    getCourseEffectiveness(courseId, cohortId || null)
      .then(setEffectData)
      .catch(() => setError('Could not load effectiveness data.'))
      .finally(() => setLoadingEffect(false));
  }, [courseId, cohortId, activeTab]);

  /* Sync URL */
  useEffect(() => {
    const p = {};
    if (courseId)   p.course = courseId;
    if (cohortId)   p.cohort = cohortId;
    if (activeTab !== 'performance') p.tab = activeTab;
    setSearchParams(p, { replace: true });
  }, [courseId, cohortId, activeTab]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedCohort = cohorts.find((c) => c.id === cohortId);
  const { summary, assignments = [], students = [], cohorts: cohortStats = [], gradeDistribution } = perfData ?? {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Course Analytics</h1>
          <p>Student performance and course effectiveness metrics.</p>
        </div>
        {selectedCourse && (
          <Link to={`/courses/${selectedCourse.id}`} className="btn btn-secondary btn-sm">
            View Course →
          </Link>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Selectors ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 240, flex: 1 }}>
            <label>Course</label>
            {loadingCourses ? <LoadingSpinner /> : (
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">— select a course —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            )}
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 180, flex: '0 1 220px' }}>
            <label>Cohort</label>
            {loadingCohorts ? <LoadingSpinner /> : (
              <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} disabled={!courseId || cohorts.length === 0}>
                <option value="">All cohorts</option>
                {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[
          { key: 'performance',   label: 'Student Performance' },
          { key: 'effectiveness', label: 'Course Effectiveness' },
        ].map((t) => (
          <button key={t.key} className={`tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {!courseId && (
        <div className="empty-state"><p>Select a course to view analytics.</p></div>
      )}

      {/* ══ Student Performance tab ══ */}
      {courseId && activeTab === 'performance' && (
        <>
          {loadingPerf && <LoadingSpinner />}
          {!loadingPerf && perfData && (
            <>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                <KpiCard label="Enrolled" value={summary.enrolledCount} sub={`${summary.submittingCount} submitted work`} />
                <KpiCard label="Avg Grade" value={summary.avgGradePct != null ? `${summary.avgGradePct}%` : '—'}
                  color={gradeColor(summary.avgGradePct)} sub={`${summary.gradedStudentCount} students graded`} />
                <KpiCard label="Submission Rate"
                  value={summary.enrolledCount > 0 ? `${pct(summary.submittingCount, summary.enrolledCount)}%` : '—'}
                  sub={`of ${summary.totalAssignments} assignment${summary.totalAssignments !== 1 ? 's' : ''}`} />
                <KpiCard label="At Risk" value={summary.atRiskCount}
                  color={summary.atRiskCount > 0 ? 'var(--danger)' : 'var(--success)'}
                  sub="below 60% or missing work" />
              </div>

              {assignments.length > 0 && (
                <Section title="Assignment Performance" action={<span className="text-xs text-muted">Sorted hardest → easiest</span>}>
                  <AssignmentPerformance assignments={assignments} />
                </Section>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: 24, marginBottom: 28 }}>
                <Section title="Grade Distribution">
                  <GradeDistribution dist={gradeDistribution} totalStudents={summary.gradedStudentCount} />
                </Section>
                <Section
                  title={`At-Risk Students${summary.atRiskCount > 0 ? ` (${summary.atRiskCount})` : ''}`}
                  action={summary.atRiskCount > 0
                    ? <Link to={`/admin/grades?course=${courseId}${cohortId ? `&cohort=${cohortId}` : ''}`} className="text-xs" style={{ color: 'var(--accent)' }}>View gradebook →</Link>
                    : null}>
                  <AtRiskStudents students={students} totalAssignments={summary.totalAssignments} />
                </Section>
              </div>

              {!cohortId && <CohortComparison cohorts={cohortStats} />}

              <p className="text-xs text-muted">
                At-risk: avg grade &lt; 60% or submitted fewer than half of published assignments.
                ⚠ on assignments = submission rate below 50%.
              </p>
            </>
          )}
        </>
      )}

      {/* ══ Course Effectiveness tab ══ */}
      {courseId && activeTab === 'effectiveness' && (
        <>
          {loadingEffect && <LoadingSpinner />}
          {!loadingEffect && effectData && (() => {
            const { summary: es, assignments: ea } = effectData;
            const backlogColor = es.totalUngraded > 10 ? 'var(--danger)'
              : es.totalUngraded > 0 ? 'var(--warning)' : 'var(--success)';
            const turnaroundWarn = es.avgTurnaroundHours != null && es.avgTurnaroundHours > 48;
            const oldestDays = es.oldestUngradedAt
              ? Math.floor((Date.now() - new Date(es.oldestUngradedAt).getTime()) / 86400000)
              : null;

            return (
              <>
                {/* ── Grading health KPIs ── */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
                  <EffectivenessKpi
                    label="Grading Backlog"
                    value={es.totalUngraded}
                    color={backlogColor}
                    sub={es.totalUngraded > 0 && oldestDays != null ? `Oldest: ${oldestDays}d ago` : 'All submissions graded'}
                    warn={es.totalUngraded > 0 && oldestDays != null && oldestDays > 7}
                  />
                  <EffectivenessKpi
                    label="Grading Completion"
                    value={es.gradingCompletion != null ? `${es.gradingCompletion}%` : '—'}
                    color={es.gradingCompletion != null ? gradeColor(es.gradingCompletion) : undefined}
                    sub="of submitted work graded"
                  />
                  <EffectivenessKpi
                    label="Avg Turnaround"
                    value={es.avgTurnaroundHours != null
                      ? es.avgTurnaroundHours < 24
                        ? `${es.avgTurnaroundHours}h`
                        : `${(es.avgTurnaroundHours / 24).toFixed(1)}d`
                      : '—'}
                    sub="manual grading only"
                    warn={turnaroundWarn}
                    color={turnaroundWarn ? 'var(--warning)' : es.avgTurnaroundHours != null ? 'var(--success)' : undefined}
                  />
                  <EffectivenessKpi
                    label="Assignments"
                    value={ea.length}
                    sub={`${ea.filter((a) => a.passRate != null && a.passRate < 60).length} with pass rate < 60%`}
                  />
                </div>

                {/* ── Pass rates + grading detail ── */}
                {ea.length > 0 && (
                  <Section title="Assignment Grading & Pass Rates" action={<span className="text-xs text-muted">Sorted lowest pass rate first</span>}>
                    <PassRateTable assignments={ea} />
                  </Section>
                )}

                {/* ── Two-column: funnel + progression ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 24, marginBottom: 28 }}>
                  <Section title="Student Engagement Funnel">
                    <EngagementFunnel assignments={[...ea].sort((a, b) => a.orderIndex - b.orderIndex)} />
                  </Section>
                  <Section title="Score Progression" action={<span className="text-xs text-muted">Avg grade % by assignment order</span>}>
                    <ScoreProgression assignments={ea} />
                  </Section>
                </div>

                <p className="text-xs text-muted">
                  Turnaround excludes auto-graded (quiz) submissions. Backlog = submitted with no grade record yet.
                  Pass rate = % of graded students scoring ≥ 60% of max.
                </p>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}
