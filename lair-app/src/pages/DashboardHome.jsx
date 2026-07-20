import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAssignments, getCourseContent } from '../api/lair.js';
import useAuthStore from '../store/authStore.js';
import ContentByType from '../components/ContentByType.jsx';

const DAY_META = {
  1: 'Linux Foundations & Evidence Collection',
  2: 'Filesystem Hierarchy, Threat Hunting & Logs',
  3: 'Memory, Live Analysis & Timelines',
};

function dayOf(assignment) {
  return Math.floor((assignment.order_index ?? 0) / 100);
}

export default function DashboardHome() {
  const { user }      = useAuthStore();
  const [assignments, setAssignments] = useState([]);
  const [content,     setContent]     = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([getAssignments().catch(() => []), getCourseContent().catch(() => [])])
      .then(([rawA, rawC]) => {
        setAssignments(Array.isArray(rawA) ? rawA : (rawA.data ?? []));
        setContent(Array.isArray(rawC) ? rawC : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const unlocked   = assignments.filter((a) => a.is_unlocked !== false);
  const completed  = unlocked.filter((a) => (a.progress ?? 0) >= 100).length;
  const inProgress = unlocked.filter((a) => (a.progress ?? 0) > 0 && (a.progress ?? 0) < 100).length;
  const total      = unlocked.length;

  const overallPct = total > 0
    ? Math.round(unlocked.reduce((s, a) => s + (a.progress ?? 0), 0) / total)
    : 0;

  const days = [1, 2, 3].map((day) => {
    const sections = unlocked.filter((a) => dayOf(a) === day);
    const dayPct = sections.length
      ? Math.round(sections.reduce((s, a) => s + (a.progress ?? 0), 0) / sections.length)
      : 0;
    return { day, title: DAY_META[day], sections, pct: dayPct };
  }).filter((d) => d.sections.length > 0);

  const next = unlocked
    .filter((a) => (a.progress ?? 0) < 100)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0];

  const publishedContent = content.filter((c) => c.is_unlocked !== false);

  return (
    <div className="dash-home">
      <div className="dash-welcome">
        <h1 className="dash-welcome-name">Welcome, {user?.first_name}</h1>
        <p className="dash-welcome-sub">LAIR — Linux Analysis &amp; Incident Response</p>
      </div>

      <div className="stats-banner">
        <div className="stat-glass">
          <div className="stat-glass-icon">◈</div>
          <div className="stat-glass-value">{total}</div>
          <div className="stat-glass-label">Sections Unlocked</div>
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
          <div className="stat-glass-label">Course Progress</div>
        </div>
      </div>

      {next && (
        <Link to={`/course#${next.id}`} className="glass-card dash-continue-card">
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>
              {(next.progress ?? 0) > 0 ? 'Continue where you left off' : 'Next up'}
            </div>
            <div className="dash-continue-title">{next.title.replace(/^Day \d+ [–-]\s*/, '')}</div>
          </div>
          <span className="dash-continue-arrow">→</span>
        </Link>
      )}

      <div className="glass-card dash-progress-card">
        <div className="dash-progress-header">
          <span className="section-label">Course Progress</span>
          <span className="dash-progress-fraction">{completed} / {total}</span>
        </div>
        <div className="progress-track progress-track-lg">
          <div className="progress-fill progress-fill-glow" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="dash-progress-footer">
          <span>{completed} of {total} sections complete</span>
          <span>{overallPct}%</span>
        </div>
      </div>

      {days.length > 0 && (
        <div className="glass-card dash-inprogress-card">
          <div className="section-label" style={{ marginBottom: 14 }}>By Day</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {days.map((d) => (
              <div key={d.day} className="dash-progress-row">
                <span className="dash-progress-title">Day {d.day} — {d.title}</span>
                <div className="progress-track" style={{ flex: 1 }}>
                  <div className="progress-fill progress-fill-glow" style={{ width: `${d.pct}%` }} />
                </div>
                <span className="dash-progress-pct">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {publishedContent.length > 0 && (
        <div>
          <div className="section-label" style={{ marginBottom: 14 }}>Course Materials</div>
          <ContentByType items={publishedContent} />
        </div>
      )}
    </div>
  );
}
