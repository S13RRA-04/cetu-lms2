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

      {!loadingGrades && students.length > 0 && (
        <>
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="text-sm fw-600" style={{ color: 'var(--muted)' }}>
              {selectedCourse?.title}{selectedCohort ? ` · ${selectedCohort.name}` : ' · All Cohorts'}
            </span>
            <span className="text-xs text-muted">Hover a cell for details</span>
          </div>

          <div className="card" style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
              <thead>
                <tr style={{ verticalAlign: 'bottom' }}>
                  <th style={{
                    position: 'sticky', left: 0, zIndex: 2,
                    background: 'var(--surface, #f8fafc)',
                    width: 180, minWidth: 180, padding: '0 10px 6px',
                    borderBottom: '2px solid var(--border)', textAlign: 'left',
                    fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: '.04em',
                  }}>Student</th>

                  {!cohortId && (
                    <th style={{
                      position: 'sticky', left: 180, zIndex: 2,
                      background: 'var(--surface, #f8fafc)',
                      width: 110, minWidth: 110, padding: '0 10px 6px',
                      borderBottom: '2px solid var(--border)', textAlign: 'left',
                      fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>Cohort</th>
                  )}

                  {assignments.map((a) => (
                    <th key={a.id} style={{
                      width: COL, minWidth: COL, maxWidth: COL,
                      height: 100, padding: 0,
                      verticalAlign: 'bottom',
                      borderBottom: '2px solid var(--border)',
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute', bottom: 6, left: '50%',
                        transform: 'translateX(-50%) rotate(-60deg)',
                        transformOrigin: 'center bottom',
                        whiteSpace: 'nowrap',
                        fontSize: 11, fontWeight: 600, color: 'var(--text)',
                      }} title={`${a.title} (max ${a.max})`}>
                        {a.title}
                      </div>
                    </th>
                  ))}

                  <th style={{
                    width: 90, minWidth: 90, padding: '0 10px 6px',
                    borderBottom: '2px solid var(--border)',
                    textAlign: 'center',
                    fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: '.04em',
                  }}>Total</th>
                </tr>
              </thead>

              <tbody>
                {students.map((stu, si) => {
                  const totalEarned = assignments.reduce((s, a) => s + (stu.grades[a.id]?.score ?? 0), 0);
                  const totalMax    = assignments.reduce((s, a) => s + a.max, 0);
                  const totalPct    = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : null;
                  const rowBg       = si % 2 === 0 ? 'white' : 'var(--surface, #f8fafc)';

                  return (
                    <tr key={stu.id} style={{ background: rowBg }}>
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 1,
                        background: rowBg,
                        padding: '7px 10px',
                        borderBottom: '1px solid var(--border)',
                        minWidth: 180,
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {stu.lastName}, {stu.firstName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{stu.email}</div>
                      </td>

                      {!cohortId && (
                        <td style={{
                          position: 'sticky', left: 180, zIndex: 1,
                          background: rowBg,
                          padding: '7px 10px',
                          borderBottom: '1px solid var(--border)',
                          fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap',
                        }}>{stu.cohortName ?? '—'}</td>
                      )}

                      {assignments.map((a) => {
                        const g = stu.grades[a.id];
                        const cellBase = {
                          width: COL, minWidth: COL, maxWidth: COL,
                          padding: '7px 2px', textAlign: 'center',
                          borderBottom: '1px solid var(--border)', fontSize: 12,
                        };
                        if (!g) return <td key={a.id} style={{ ...cellBase, color: 'var(--muted)' }}>·</td>;
                        if (g.score === null) return (
                          <td key={a.id} style={cellBase} title={`${a.title} — ${g.submissionStatus}`}>
                            <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 4px' }}>
                              sub
                            </span>
                          </td>
                        );
                        const pct = a.max > 0 ? Math.round((g.score / a.max) * 100) : 0;
                        const tip = [`${a.title}`, `Score: ${g.score}/${a.max} (${pct}%)`,
                          g.feedback ? `Feedback: ${g.feedback}` : null,
                          g.gradedAt ? `Graded: ${new Date(g.gradedAt).toLocaleDateString()}` : null,
                        ].filter(Boolean).join('\n');
                        return (
                          <td key={a.id} style={cellBase} title={tip}>
                            <span style={{ fontWeight: 700, color: pctColor(pct), fontSize: 13 }}>{g.score}</span>
                          </td>
                        );
                      })}

                      <td style={{ padding: '7px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                        {totalPct !== null ? (
                          <>
                            <span style={{ fontWeight: 700, color: pctColor(totalPct), fontSize: 13 }}>{Math.round(totalEarned)}</span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}> /{Math.round(totalMax)}</span>
                            <div style={{ fontSize: 10, color: pctColor(totalPct) }}>{totalPct}%</div>
                          </>
                        ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted" style={{ marginTop: 8 }}>
            <strong>sub</strong> = submitted, awaiting grade · <strong>·</strong> = no submission · Hover a cell for full details
          </p>
        </>
      )}
    </div>
  );
}
