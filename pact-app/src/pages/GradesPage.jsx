import { useEffect, useState } from 'react';
import { getMyGrades } from '../api/pact.js';

export default function GradesPage() {
  const [grades,  setGrades]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyGrades()
      .then(setGrades)
      .catch(() => setGrades([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const totalEarned = grades.reduce((s, g) => s + parseFloat(g.score ?? 0), 0);
  const totalMax    = grades.reduce((s, g) => s + parseFloat(g.max_score ?? 100), 0);
  const overallPct  = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return (
    <div className="grades-page">
      <h1 className="page-title">Performance Record</h1>

      {grades.length === 0 ? (
        <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>No evaluations on record.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="stats-banner" style={{ marginBottom: 24 }}>
            <div className="stat-glass">
              <div className="stat-glass-value" style={{ color: '#2563eb' }}>{overallPct}%</div>
              <div className="stat-glass-label">Overall</div>
            </div>
            <div className="stat-glass">
              <div className="stat-glass-value">{Math.round(totalEarned)}</div>
              <div className="stat-glass-label">Earned</div>
            </div>
            <div className="stat-glass">
              <div className="stat-glass-value">{Math.round(totalMax)}</div>
              <div className="stat-glass-label">Possible</div>
            </div>
            <div className="stat-glass">
              <div className="stat-glass-value">{grades.length}</div>
              <div className="stat-glass-label">Evaluated</div>
            </div>
          </div>

          {/* Grades table */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <div className="grades-table">
              <div className="grades-thead">
                <span>Tasking</span>
                <span>Score</span>
                <span>Max</span>
                <span>%</span>
                <span>Evaluated</span>
              </div>
              {grades.map((g) => {
                const pct = Math.round((parseFloat(g.score) / parseFloat(g.max_score)) * 100);
                const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={g.id} className="grades-row">
                    <span className="grades-title">{g.Assignment?.title ?? '—'}</span>
                    <span className="grades-score" style={{ color }}>{g.score}</span>
                    <span className="grades-max">{g.max_score}</span>
                    <span className="grades-pct" style={{ color }}>{pct}%</span>
                    <span className="grades-date">
                      {g.graded_at ? new Date(g.graded_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            {grades.some((g) => g.feedback) && (
              <div style={{ marginTop: 24 }}>
                <div className="section-label" style={{ marginBottom: 12 }}>After Action Review</div>
                {grades.filter((g) => g.feedback).map((g) => (
                  <div key={g.id} className="feedback-row">
                    <div className="feedback-assignment">{g.Assignment?.title}</div>
                    <div className="feedback-text">{g.feedback}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
