import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProgramOverview } from '../../api/courses.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

/* ── Helpers ── */
const gradeColor = (p) =>
  p == null ? 'var(--text-muted)' : p >= 80 ? 'var(--success)' : p >= 60 ? 'var(--warning)' : 'var(--danger)';

function MiniBar({ value, max = 100, color = 'var(--accent)' }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${w}%`, background: color, height: '100%', borderRadius: 999, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, flexShrink: 0, width: 38, textAlign: 'right' }}>
        {value != null ? `${Math.round(value)}%` : '—'}
      </span>
    </div>
  );
}

function HealthPip({ score }) {
  if (score == null) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  const color = score >= 75 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  const label = score >= 75 ? 'Healthy' : score >= 50 ? 'Needs attention' : 'At risk';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{score}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>— {label}</span>
    </div>
  );
}

/* ── Aggregate stats across a set of courses ── */
function aggregatePM(courses) {
  const enrolled    = courses.reduce((s, c) => s + c.enrolledCount, 0);
  const ungraded    = courses.reduce((s, c) => s + c.ungradedCount, 0);
  const atRisk      = courses.reduce((s, c) => s + c.atRiskCount, 0);
  const gradedCrs   = courses.filter((c) => c.avgGradePct != null);
  const avgGrade    = gradedCrs.length ? Math.round(gradedCrs.reduce((s, c) => s + c.avgGradePct, 0) / gradedCrs.length) : null;
  const subCrs      = courses.filter((c) => c.submissionRate != null);
  const avgSub      = subCrs.length ? Math.round(subCrs.reduce((s, c) => s + c.submissionRate, 0) / subCrs.length) : null;
  const scoredCrs   = courses.filter((c) => c.healthScore != null);
  const avgHealth   = scoredCrs.length ? Math.round(scoredCrs.reduce((s, c) => s + c.healthScore, 0) / scoredCrs.length) : null;
  const oldest      = courses.reduce((o, c) => {
    if (!c.oldestUngradedAt) return o;
    return !o || new Date(c.oldestUngradedAt) < new Date(o) ? c.oldestUngradedAt : o;
  }, null);
  return { enrolled, ungraded, atRisk, avgGrade, avgSub, avgHealth, oldest };
}

/* ── PM summary row ── */
function PMSummaryRow({ instructorName, instructorEmail, courses }) {
  const [open, setOpen] = useState(false);
  const agg = aggregatePM(courses);
  const oldestDays = agg.oldest
    ? Math.floor((Date.now() - new Date(agg.oldest).getTime()) / 86400000)
    : null;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      {/* PM header row */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          cursor: 'pointer', background: open ? 'var(--accent-light)' : 'var(--surface)',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 14, opacity: .5 }}>{open ? '▼' : '▶'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{instructorName}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{instructorEmail ?? 'No email'} · {courses.length} course{courses.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Aggregate KPI chips */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: gradeColor(agg.avgGrade) }}>{agg.avgGrade != null ? `${agg.avgGrade}%` : '—'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg Grade</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{agg.enrolled}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Students</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: agg.ungraded > 0 ? 'var(--warning)' : 'var(--success)' }}>
              {agg.ungraded}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ungraded</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: agg.atRisk > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {agg.atRisk}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>At-Risk</div>
          </div>
          <HealthPip score={agg.avgHealth} />
        </div>
      </div>

      {/* Course detail rows */}
      {open && (
        <div style={{ background: '#fafbfc' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--border)' }}>
                <th style={{ padding: '6px 16px 6px 40px', textAlign: 'left', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>Course</th>
                <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', width: 80 }}>Status</th>
                <th style={{ padding: '6px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', width: 70, textAlign: 'center' }}>Students</th>
                <th style={{ padding: '6px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', width: 160 }}>Avg Grade</th>
                <th style={{ padding: '6px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', width: 140 }}>Submission Rate</th>
                <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', width: 80 }}>Ungraded</th>
                <th style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', width: 60 }}>At-Risk</th>
                <th style={{ padding: '6px 12px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em', width: 130 }}>Health</th>
                <th style={{ padding: '6px 16px', width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {courses.map((c, i) => {
                const courseDays = c.oldestUngradedAt
                  ? Math.floor((Date.now() - new Date(c.oldestUngradedAt).getTime()) / 86400000)
                  : null;
                return (
                  <tr key={c.courseId} style={{ background: i % 2 === 0 ? 'white' : '#fafbfc', borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 16px 10px 40px' }}>
                      <div style={{ fontWeight: 600 }}>{c.courseTitle}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.assignmentCount} assignment{c.assignmentCount !== 1 ? 's' : ''}</div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <span className={`badge ${c.courseStatus === 'published' ? 'badge-green' : c.courseStatus === 'archived' ? 'badge-gray' : 'badge-blue'}`} style={{ fontSize: 10 }}>
                        {c.courseStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 600 }}>{c.enrolledCount}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <MiniBar value={c.avgGradePct} color={gradeColor(c.avgGradePct)} />
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <MiniBar value={c.submissionRate} color="var(--accent)" />
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      {c.ungradedCount > 0
                        ? <span style={{ fontWeight: 700, color: courseDays != null && courseDays > 7 ? 'var(--danger)' : 'var(--warning)' }}
                            title={courseDays != null ? `Oldest submission: ${courseDays}d ago` : undefined}>
                            {c.ungradedCount}
                          </span>
                        : <span style={{ color: 'var(--success)', fontSize: 13 }}>✓</span>}
                    </td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      {c.atRiskCount > 0
                        ? <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{c.atRiskCount}</span>
                        : <span style={{ color: 'var(--success)', fontSize: 13 }}>✓</span>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <HealthPip score={c.healthScore} />
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Link to={`/admin/analytics?course=${c.courseId}`} className="btn btn-ghost btn-xs">Analytics</Link>
                        <Link to={`/courses/${c.courseId}`} className="btn btn-ghost btn-xs">View</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function AdminProgramOverviewPage() {
  const [courses,  setCourses]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [sortBy,   setSortBy]   = useState('instructor');  // instructor | health | grade | backlog

  useEffect(() => {
    getProgramOverview()
      .then(setCourses)
      .catch(() => setError('Could not load program overview.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  /* Group by instructor */
  const byInstructor = courses.reduce((acc, c) => {
    const key = c.instructorId ?? '__unassigned__';
    if (!acc[key]) acc[key] = { instructorId: c.instructorId, instructorName: c.instructorName, instructorEmail: c.instructorEmail, courses: [] };
    acc[key].courses.push(c);
    return acc;
  }, {});

  let groups = Object.values(byInstructor);

  /* Sort groups */
  if (sortBy === 'instructor') {
    groups.sort((a, b) => a.instructorName.localeCompare(b.instructorName));
  } else if (sortBy === 'health') {
    groups.sort((a, b) => (aggregatePM(a.courses).avgHealth ?? -1) - (aggregatePM(b.courses).avgHealth ?? -1));
  } else if (sortBy === 'grade') {
    groups.sort((a, b) => (aggregatePM(a.courses).avgGrade ?? -1) - (aggregatePM(b.courses).avgGrade ?? -1));
  } else if (sortBy === 'backlog') {
    groups.sort((a, b) => aggregatePM(b.courses).ungraded - aggregatePM(a.courses).ungraded);
  }

  /* Fleet-level totals */
  const fleetEnrolled  = courses.reduce((s, c) => s + c.enrolledCount, 0);
  const fleetUngraded  = courses.reduce((s, c) => s + c.ungradedCount, 0);
  const fleetAtRisk    = courses.reduce((s, c) => s + c.atRiskCount, 0);
  const fleetGradedCrs = courses.filter((c) => c.avgGradePct != null);
  const fleetAvgGrade  = fleetGradedCrs.length
    ? Math.round(fleetGradedCrs.reduce((s, c) => s + c.avgGradePct, 0) / fleetGradedCrs.length)
    : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Program Overview</h1>
          <p>Cross-course health metrics grouped by program manager — for unit leadership.</p>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Fleet summary ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {[
          { label: 'Total Courses',    value: courses.length,                color: undefined },
          { label: 'Total Students',   value: fleetEnrolled,                 color: undefined },
          { label: 'Fleet Avg Grade',  value: fleetAvgGrade != null ? `${fleetAvgGrade}%` : '—', color: fleetAvgGrade != null ? (fleetAvgGrade >= 80 ? 'var(--success)' : fleetAvgGrade >= 60 ? 'var(--warning)' : 'var(--danger)') : undefined },
          { label: 'Ungraded Work',    value: fleetUngraded,                 color: fleetUngraded > 0 ? 'var(--warning)' : 'var(--success)' },
          { label: 'At-Risk Students', value: fleetAtRisk,                   color: fleetAtRisk > 0 ? 'var(--danger)' : 'var(--success)' },
          { label: 'Program Managers', value: groups.length,                 color: undefined },
        ].map((k) => (
          <div key={k.label} className="card" style={{ flex: 1, minWidth: 120 }}>
            <div className="card-body" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.color ?? 'var(--text)', lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Sort controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span className="text-sm fw-600 text-muted">Sort by:</span>
        {[
          { key: 'instructor', label: 'Program Manager' },
          { key: 'health',     label: 'Health ↑' },
          { key: 'grade',      label: 'Avg Grade ↑' },
          { key: 'backlog',    label: 'Backlog ↓' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            className={`btn btn-sm ${sortBy === s.key ? 'btn-primary' : 'btn-ghost'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── PM groups ── */}
      {courses.length === 0 ? (
        <div className="empty-state"><p>No courses found.</p></div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {groups.map((g) => (
            <PMSummaryRow
              key={g.instructorId ?? '__unassigned__'}
              instructorName={g.instructorName}
              instructorEmail={g.instructorEmail}
              courses={g.courses}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted" style={{ marginTop: 12 }}>
        Health score (0–100): composite of avg grade (70%), grading backlog (20%), and at-risk rate (10%).
        Oldest ungraded tooltip shown in red after 7 days.
      </p>
    </div>
  );
}
