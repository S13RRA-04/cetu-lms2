import { useEffect, useState } from 'react';
import { getMyEnrollment, getAssignments } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';

export default function DashboardHome() {
  const { user }      = useAuthStore();
  const [enrollment,  setEnrollment]  = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getMyEnrollment().catch(() => null), getAssignments().catch(() => [])])
      .then(([enroll, raw]) => {
        setEnrollment(enroll);
        setAssignments(Array.isArray(raw) ? raw : (raw.data ?? []));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const unlocked   = assignments.filter((a) => a.is_unlocked !== false).length;
  const completed  = assignments.filter((a) => (a.progress ?? 0) >= 100).length;
  const inProgress = assignments.filter((a) => (a.progress ?? 0) > 0 && (a.progress ?? 0) < 100).length;
  const total      = assignments.length;

  const overallPct = total > 0
    ? Math.round(assignments.reduce((s, a) => s + (a.progress ?? 0), 0) / total)
    : 0;

  return (
    <div className="dash-home">
      {/* Welcome */}
      <div className="dash-welcome">
        <h1 className="dash-welcome-name">Welcome, {user?.first_name}</h1>
        <p className="dash-welcome-sub">
          {enrollment?.cohort?.name ?? 'PACT Mission Dashboard'}
          {enrollment?.squad && (
            <><span className="dash-welcome-sep">·</span>Squad {enrollment.squad.number}</>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-banner">
        <div className="stat-glass">
          <div className="stat-glass-icon">◈</div>
          <div className="stat-glass-value">{unlocked}</div>
          <div className="stat-glass-label">Unlocked</div>
        </div>
        <div className="stat-glass stat-glass-green">
          <div className="stat-glass-icon">◉</div>
          <div className="stat-glass-value">{completed}</div>
          <div className="stat-glass-label">Completed</div>
        </div>
        <div className="stat-glass stat-glass-amber">
          <div className="stat-glass-icon">⬡</div>
          <div className="stat-glass-value">{inProgress}</div>
          <div className="stat-glass-label">In Progress</div>
        </div>
        <div className="stat-glass stat-glass-primary stat-glass-wide">
          <div className="stat-glass-icon">◇</div>
          <div className="stat-glass-value">{overallPct}%</div>
          <div className="stat-glass-label">Overall</div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="glass-card dash-progress-card">
        <div className="dash-progress-header">
          <span className="section-label">Course Progress</span>
          <span className="dash-progress-fraction">{completed} / {total}</span>
        </div>
        <div className="progress-track progress-track-lg">
          <div className="progress-fill progress-fill-glow" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="dash-progress-footer">
          <span>{completed} of {total} missions complete</span>
          <span>{overallPct}%</span>
        </div>
      </div>

      {/* Squad card */}
      {enrollment?.squad && (
        <div className="glass-card squad-card squad-card-accent">
          <div className="squad-card-header">
            <div className="squad-badge-large">
              <span className="squad-badge-num">{enrollment.squad.number}</span>
            </div>
            <div className="squad-card-title">
              <div className="squad-number">Squad {enrollment.squad.number}{enrollment.squad.name ? ` · ${enrollment.squad.name}` : ''}</div>
              <div className="squad-count">{(enrollment.squad.students ?? []).length} operators</div>
            </div>
          </div>
          <div className="squad-members">
            {(enrollment.squad.students ?? []).map((m) => (
              <div
                key={m.id}
                className={`squad-member${m.id === user?.id ? ' squad-member-self' : ''}`}
              >
                <div className="member-avatar">{m.first_name?.[0]}{m.last_name?.[0]}</div>
                <span>{m.first_name} {m.last_name}{m.id === user?.id ? ' (you)' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In-progress missions */}
      {inProgress > 0 && (
        <div className="glass-card dash-inprogress-card">
          <div className="section-label" style={{ marginBottom: 14 }}>Active Missions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assignments
              .filter((a) => (a.progress ?? 0) > 0 && (a.progress ?? 0) < 100)
              .map((a) => (
                <div key={a.id} className="dash-progress-row">
                  <span className="dash-progress-title">{a.title}</span>
                  <div className="progress-track" style={{ flex: 1 }}>
                    <div className="progress-fill progress-fill-glow" style={{ width: `${a.progress}%` }} />
                  </div>
                  <span className="dash-progress-pct">{a.progress}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
