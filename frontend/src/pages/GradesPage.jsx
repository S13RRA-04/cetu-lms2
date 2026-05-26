import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyGrades } from '../api/profile.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

export default function GradesPage() {
  const [grades,  setGrades]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getMyGrades()
      .then(setGrades)
      .catch(() => setError('Failed to load grades.'))
      .finally(() => setLoading(false));
  }, []);

  const pct = (score, max) => (max > 0 ? Math.round((score / max) * 100) : 0);

  const letterGrade = (p) => {
    if (p >= 90) return { letter: 'A', cls: 'badge-green' };
    if (p >= 80) return { letter: 'B', cls: 'badge-blue' };
    if (p >= 70) return { letter: 'C', cls: 'badge-yellow' };
    if (p >= 60) return { letter: 'D', cls: 'badge-yellow' };
    return { letter: 'F', cls: 'badge-red' };
  };

  const avg = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + pct(g.score, g.max_score), 0) / grades.length)
    : null;

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Grades</h1>
          <p>{grades.length} graded assignment{grades.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {avg !== null && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Overall Average</div>
            <div className="stat-value" style={{ color: avg >= 70 ? 'var(--success)' : 'var(--danger)' }}>{avg}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Assignments Graded</div>
            <div className="stat-value">{grades.length}</div>
          </div>
        </div>
      )}

      {grades.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <h3 style={{ marginTop: 8 }}>No grades yet</h3>
          <p>Your grades will appear here once your instructor grades your submissions.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>Course</th>
                  <th>Score</th>
                  <th>Grade</th>
                  <th>Feedback</th>
                  <th>Graded</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => {
                  const p = pct(g.score, g.max_score);
                  const { letter, cls } = letterGrade(p);
                  return (
                    <tr key={g.id}>
                      <td className="fw-600">{g.Assignment?.title ?? '—'}</td>
                      <td>
                        {g.Assignment?.course_id
                          ? <Link to={`/courses/${g.Assignment.course_id}`} className="text-sm">{g.Assignment.course_id}</Link>
                          : '—'}
                      </td>
                      <td>
                        <span className="fw-600">{g.score}</span>
                        <span className="text-muted text-sm"> / {g.max_score}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${cls}`}>{letter}</span>
                          <span className="text-xs text-muted">{p}%</span>
                        </div>
                      </td>
                      <td className="text-sm text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.feedback ?? '—'}
                      </td>
                      <td className="text-xs text-muted">
                        {g.graded_at ? new Date(g.graded_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
