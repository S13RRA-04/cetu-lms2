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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.16em' }}>
        LOADING PERFORMANCE LOG...
      </div>
    </div>
  );

  const totalEarned = grades.reduce((s, g) => s + parseFloat(g.score ?? 0), 0);
  const totalMax    = grades.reduce((s, g) => s + parseFloat(g.max_score ?? 100), 0);
  const overallPct  = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const overallColor = overallPct >= 80 ? 'var(--green)' : overallPct >= 60 ? 'var(--warning)' : '#ef4444';

  return (
    <div className="ops-dashboard">
      <div className="ops-dash-eyebrow">OPERATOR RECORD</div>
      <h1 className="ops-dash-name" style={{ marginBottom: 20 }}>Performance Log</h1>

      {grades.length === 0 ? (
        <div className="ops-empty-state">
          <div className="ops-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="ops-empty-label">NO EVALUATIONS ON RECORD</div>
          <div className="ops-empty-sub">Performance data will appear after grading is complete.</div>
        </div>
      ) : (
        <>
          <div className="ops-stat-strip" style={{ marginBottom: 24 }}>
            <div className="ops-stat" style={{ borderColor: `${overallColor}33` }}>
              <div className="ops-stat-value" style={{ color: overallColor }}>
                {overallPct}<span style={{ fontSize: '0.55em', fontWeight: 400 }}>%</span>
              </div>
              <div className="ops-stat-label">SCORE</div>
            </div>
            <div className="ops-stat">
              <div className="ops-stat-value">{Math.round(totalEarned)}</div>
              <div className="ops-stat-label">EARNED</div>
            </div>
            <div className="ops-stat">
              <div className="ops-stat-value">{Math.round(totalMax)}</div>
              <div className="ops-stat-label">POSSIBLE</div>
            </div>
            <div className="ops-stat ops-stat-green">
              <div className="ops-stat-value">{grades.length}</div>
              <div className="ops-stat-label">EVALUATED</div>
            </div>
          </div>

          <div className="ops-perf-table">
            <div className="ops-perf-thead">
              <span>TASKING</span>
              <span>SCORE</span>
              <span>MAX</span>
              <span>PCT</span>
              <span>EVALUATED</span>
            </div>
            {grades.map((g) => {
              const pct = parseFloat(g.max_score) > 0
                ? Math.round((parseFloat(g.score) / parseFloat(g.max_score)) * 100)
                : 0;
              const rc = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--warning)' : '#ef4444';
              return (
                <div key={g.id} className="ops-perf-row">
                  <span className="ops-perf-title">{g.Assignment?.title ?? '—'}</span>
                  <span className="ops-perf-val" style={{ color: rc }}>{g.score}</span>
                  <span className="ops-perf-max">{g.max_score}</span>
                  <span className="ops-perf-pct" style={{ color: rc }}>{pct}%</span>
                  <span className="ops-perf-date">
                    {g.graded_at ? new Date(g.graded_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {grades.some((g) => g.feedback) && (
            <div className="ops-aar-block">
              <div className="ops-section-label" style={{ marginBottom: 12 }}>AFTER ACTION REVIEW</div>
              {grades.filter((g) => g.feedback).map((g) => (
                <div key={g.id} className="ops-aar-item">
                  <div className="ops-aar-assignment">{g.Assignment?.title}</div>
                  <div className="ops-aar-text">{g.feedback}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
