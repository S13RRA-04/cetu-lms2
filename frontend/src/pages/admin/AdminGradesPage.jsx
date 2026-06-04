import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCourses, getCourseGrades } from '../../api/courses.js';
import { listCohorts } from '../../api/cohorts.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

const pctColor = (pct) =>
  pct >= 80 ? 'var(--success)' : pct >= 60 ? '#f59e0b' : 'var(--danger)';

const COL = 44;

export default function AdminGradesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses,   setCourses]   = useState([]);
  const [cohorts,   setCohorts]   = useState([]);
  const [rows,      setRows]      = useState([]);

  const [courseId,  setCourseId]  = useState(searchParams.get('course') ?? '');
  const [cohortId,  setCohortId]  = useState(searchParams.get('cohort') ?? '');

  const [loadingCourses,  setLoadingCourses]  = useState(true);
  const [loadingCohorts,  setLoadingCohorts]  = useState(false);
  const [loadingGrades,   setLoadingGrades]   = useState(false);
  const [error,           setError]           = useState('');

  /* Load course list once */
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

  /* When course changes, load its cohorts and reset cohort selection */
  useEffect(() => {
    if (!courseId) { setCohorts([]); setCohortId(''); setRows([]); return; }
    setLoadingCohorts(true);
    setCohortId('');
    setRows([]);
    listCohorts(courseId)
      .then((list) => {
        setCohorts(list);
        if (list.length === 1) setCohortId(list[0].id);
      })
      .catch(() => setCohorts([]))
      .finally(() => setLoadingCohorts(false));
  }, [courseId]);

  /* When course or cohort changes, load grades */
  useEffect(() => {
    if (!courseId) return;
    setLoadingGrades(true);
    setError('');
    setRows([]);
    getCourseGrades(courseId, cohortId || null)
      .then(setRows)
      .catch(() => setError('Could not load grades.'))
      .finally(() => setLoadingGrades(false));

    /* Keep URL in sync so the page is bookmarkable */
    const p = {};
    if (courseId) p.course = courseId;
    if (cohortId) p.cohort = cohortId;
    setSearchParams(p, { replace: true });
  }, [courseId, cohortId]);

  /* Pivot flat API rows into assignments list + per-student grade map */
  const assignmentMap = new Map();
  const studentMap    = new Map();
  rows.forEach((r) => {
    if (!assignmentMap.has(r.assignmentId)) {
      assignmentMap.set(r.assignmentId, {
        id: r.assignmentId, title: r.assignmentTitle,
        max: parseFloat(r.assignmentMax ?? 0), order: r.orderIndex,
      });
    }
    if (!studentMap.has(r.userId)) {
      studentMap.set(r.userId, {
        id: r.userId, firstName: r.firstName, lastName: r.lastName,
        email: r.email, cohortName: r.cohortName, grades: {},
      });
    }
    if (r.score !== null && r.score !== undefined) {
      studentMap.get(r.userId).grades[r.assignmentId] = {
        score: parseFloat(r.score), max: parseFloat(r.assignmentMax ?? 0),
        feedback: r.feedback, gradedAt: r.gradedAt,
        submissionStatus: r.submissionStatus,
      };
    } else if (r.submissionStatus) {
      studentMap.get(r.userId).grades[r.assignmentId] = { score: null, submissionStatus: r.submissionStatus };
    }
  });

  const assignments = [...assignmentMap.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const students    = [...studentMap.values()].sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));

  const selectedCourse = courses.find((c) => c.id === courseId);
  const selectedCohort = cohorts.find((c) => c.id === cohortId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Grade Center</h1>
          <p>Select a course and cohort to view the gradebook.</p>
        </div>
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
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0, minWidth: 200, flex: 1 }}>
            <label>Cohort</label>
            {loadingCohorts ? <LoadingSpinner /> : (
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                disabled={!courseId || cohorts.length === 0}
              >
                <option value="">All cohorts</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Summary chips */}
          {!loadingGrades && students.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 2 }}>
              <span className="badge badge-blue">{students.length} student{students.length !== 1 ? 's' : ''}</span>
              <span className="badge badge-gray">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Gradebook ── */}
      {loadingGrades && <LoadingSpinner />}

      {!loadingGrades && !courseId && (
        <div className="empty-state"><p>Select a course to get started.</p></div>
      )}

      {!loadingGrades && courseId && students.length === 0 && (
        <div className="empty-state">
          <p>No {cohortId ? 'students in this cohort' : 'enrolled students'} with grade data yet.</p>
        </div>
      )}

      {!loadingGrades && students.length > 0 && (() => {
        /* ── visual constants ── */
        const STICKY_W   = cohortId ? 200 : 310; // px reserved for frozen left columns
        const stickyEnd  = cohortId ? 200 : 310;

        /* cell background tint by grade band */
        const cellBg = (p) =>
          p >= 80 ? 'rgba(22,163,74,.08)'
          : p >= 60 ? 'rgba(217,119,6,.08)'
          : 'rgba(220,38,38,.08)';

        return (
          <>
            {/* ── breadcrumb label ── */}
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="fw-600" style={{ fontSize: 13 }}>
                {selectedCourse?.title}
                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                  {selectedCohort ? ` · ${selectedCohort.name}` : ' · All Cohorts'}
                </span>
              </span>
              <span className="text-xs text-muted">Hover a cell for details</span>
            </div>

            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, overflowX: 'auto', boxShadow: 'var(--shadow)' }}>
              <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                <thead>
                  <tr style={{ verticalAlign: 'bottom' }}>

                    {/* ── Student (sticky) ── */}
                    <th style={{
                      position: 'sticky', left: 0, zIndex: 3,
                      background: '#f8fafc',
                      width: 200, minWidth: 200,
                      padding: '0 12px 8px',
                      borderBottom: '2px solid var(--border)',
                      textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '.06em',
                    }}>Student</th>

                    {/* ── Cohort (sticky, only when showing all cohorts) ── */}
                    {!cohortId && (
                      <th style={{
                        position: 'sticky', left: 200, zIndex: 3,
                        background: '#f8fafc',
                        width: 110, minWidth: 110,
                        padding: '0 12px 8px',
                        borderBottom: '2px solid var(--border)',
                        textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '.06em',
                        /* right shadow marks end of frozen zone */
                        boxShadow: '3px 0 6px -2px rgba(0,0,0,.12)',
                      }}>Cohort</th>
                    )}

                    {/* shadow on student header when showing single cohort */}
                    {cohortId && (
                      <th aria-hidden style={{
                        position: 'sticky', left: 200, zIndex: 3,
                        width: 0, padding: 0, border: 'none',
                        background: 'transparent',
                        boxShadow: '3px 0 6px -2px rgba(0,0,0,.12)',
                      }} />
                    )}

                    {/* ── Assignment headers (rotated) ── */}
                    {assignments.map((a) => (
                      <th key={a.id} style={{
                        width: COL, minWidth: COL, maxWidth: COL,
                        height: 120, padding: 0,
                        verticalAlign: 'bottom',
                        borderBottom: '2px solid var(--border)',
                        borderLeft: '1px solid var(--border)',
                        position: 'relative',
                        background: '#f8fafc',
                      }}>
                        <div style={{
                          position: 'absolute',
                          bottom: 8,
                          left: '50%',
                          transform: 'translateX(-50%) rotate(-55deg)',
                          transformOrigin: 'center bottom',
                          whiteSpace: 'nowrap',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text)',
                          maxWidth: 140,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }} title={`${a.title} · max ${a.max} pts`}>
                          {a.title}
                        </div>
                      </th>
                    ))}

                    {/* ── Total (sticky right — not implemented, but fixed width) ── */}
                    <th style={{
                      width: 100, minWidth: 100,
                      padding: '0 12px 8px',
                      borderBottom: '2px solid var(--border)',
                      borderLeft: '2px solid var(--border)',
                      textAlign: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '.06em',
                      background: '#f8fafc',
                    }}>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((stu, si) => {
                    const totalEarned = assignments.reduce((s, a) => s + (stu.grades[a.id]?.score ?? 0), 0);
                    const totalMax    = assignments.reduce((s, a) => s + a.max, 0);
                    const totalPct    = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : null;
                    const rowBg       = si % 2 === 0 ? '#ffffff' : '#fafbfc';

                    return (
                      <tr key={stu.id} style={{ background: rowBg }}>

                        {/* Student name (sticky) */}
                        <td style={{
                          position: 'sticky', left: 0, zIndex: 1,
                          background: rowBg,
                          padding: '9px 12px',
                          borderBottom: '1px solid var(--border)',
                          minWidth: 200,
                        }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                            {stu.lastName}, {stu.firstName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 1 }}>{stu.email}</div>
                        </td>

                        {/* Cohort (sticky) */}
                        {!cohortId && (
                          <td style={{
                            position: 'sticky', left: 200, zIndex: 1,
                            background: rowBg,
                            padding: '9px 12px',
                            borderBottom: '1px solid var(--border)',
                            fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap',
                            boxShadow: '3px 0 6px -2px rgba(0,0,0,.12)',
                          }}>{stu.cohortName ?? '—'}</td>
                        )}

                        {/* shadow placeholder for single-cohort view */}
                        {cohortId && (
                          <td aria-hidden style={{
                            position: 'sticky', left: 200, zIndex: 1,
                            width: 0, padding: 0, border: 'none',
                            background: 'transparent',
                            boxShadow: '3px 0 6px -2px rgba(0,0,0,.12)',
                          }} />
                        )}

                        {/* Grade cells */}
                        {assignments.map((a) => {
                          const g = stu.grades[a.id];
                          const base = {
                            width: COL, minWidth: COL, maxWidth: COL,
                            height: 38,
                            padding: '0 2px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            borderBottom: '1px solid var(--border)',
                            borderLeft: '1px solid var(--border)',
                          };

                          if (!g) {
                            return (
                              <td key={a.id} style={{ ...base, color: '#d1d5db' }} title="No submission">
                                ·
                              </td>
                            );
                          }
                          if (g.score === null) {
                            return (
                              <td key={a.id} style={{ ...base, background: '#eff6ff' }}
                                title={`${a.title} — submitted, awaiting grade`}>
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: 10, fontWeight: 600,
                                  color: '#2563eb',
                                  background: '#dbeafe',
                                  borderRadius: 4,
                                  padding: '2px 5px',
                                  letterSpacing: '.02em',
                                }}>sub</span>
                              </td>
                            );
                          }

                          const p   = a.max > 0 ? Math.round((g.score / a.max) * 100) : 0;
                          const tip = [
                            `${a.title}`,
                            `Score: ${g.score} / ${a.max}  (${p}%)`,
                            g.feedback   ? `Feedback: ${g.feedback}` : null,
                            g.gradedAt   ? `Graded: ${new Date(g.gradedAt).toLocaleDateString()}` : null,
                          ].filter(Boolean).join('\n');

                          return (
                            <td key={a.id} style={{ ...base, background: cellBg(p) }} title={tip}>
                              <span style={{ fontWeight: 700, color: pctColor(p), fontSize: 13 }}>{g.score}</span>
                            </td>
                          );
                        })}

                        {/* Total */}
                        <td style={{
                          padding: '9px 12px',
                          textAlign: 'center',
                          borderBottom: '1px solid var(--border)',
                          borderLeft: '2px solid var(--border)',
                          background: totalPct != null ? cellBg(totalPct) : rowBg,
                          whiteSpace: 'nowrap',
                        }}>
                          {totalPct !== null ? (
                            <>
                              <div style={{ fontWeight: 800, color: pctColor(totalPct), fontSize: 15, lineHeight: 1.2 }}>
                                {totalPct}%
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                {Math.round(totalEarned)}/{Math.round(totalMax)}
                              </div>
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(22,163,74,.2)', borderRadius: 2 }} /> ≥ 80%
              </span>
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(217,119,6,.2)', borderRadius: 2 }} /> 60–79%
              </span>
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(220,38,38,.2)', borderRadius: 2 }} /> &lt; 60%
              </span>
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', background: '#dbeafe', color: '#2563eb', borderRadius: 3, padding: '0 4px', fontSize: 10, fontWeight: 600 }}>sub</span> Submitted, awaiting grade
              </span>
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ color: '#d1d5db', fontSize: 16, lineHeight: 1 }}>·</span> No submission
              </span>
            </div>
          </>
        );
      })()}
    </div>
  );
}
