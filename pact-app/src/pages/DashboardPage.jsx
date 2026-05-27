import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyEnrollment, getAssignments, logout } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';

const Globe = lazy(() => import('../components/Globe.jsx'));

const TYPE_COLOR = {
  module:     '#2563eb',
  game:       '#059669',
  assessment: '#d97706',
  survey:     '#7c3aed',
  challenge:  '#dc2626',
  capstone:   '#b45309',
};

const TYPE_TABS = [
  { key: 'all',        label: 'All' },
  { key: 'module',     label: 'Module' },
  { key: 'challenge',  label: 'Challenge' },
  { key: 'capstone',   label: 'Capstone' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'survey',     label: 'Survey' },
  { key: 'game',       label: 'Game' },
];

export default function DashboardPage() {
  const { user, setUser } = useAuthStore();
  const navigate          = useNavigate();
  const [enrollment,  setEnrollment]  = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);
  const [activeTab,   setActiveTab]   = useState('all');

  useEffect(() => {
    Promise.all([getMyEnrollment(), getAssignments()])
      .then(([enroll, raw]) => {
        setEnrollment(enroll);
        const list = Array.isArray(raw) ? raw : (raw.data ?? []);
        setAssignments(list);
      })
      .catch((err) => {
        if (err.response?.status === 403 || err.response?.status === 404) {
          setLoadError('not_enrolled');
        } else {
          setLoadError('failed');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  const unlocked   = assignments.filter((a) => a.is_unlocked !== false).length;
  const completed  = assignments.filter((a) => (a.progress ?? 0) >= 100).length;
  const inProgress = assignments.filter((a) => (a.progress ?? 0) > 0 && (a.progress ?? 0) < 100).length;

  const typesPresent = new Set(assignments.map((a) => a.type));
  const visibleTabs  = TYPE_TABS.filter((t) => t.key === 'all' || typesPresent.has(t.key));
  const visible      = activeTab === 'all'
    ? assignments
    : assignments.filter((a) => a.type === activeTab);

  return (
    <div className="pact-layout">

      {/* ── Globe background ── */}
      <div className="globe-bg" aria-hidden="true">
        <Suspense fallback={null}>
          <Globe className="globe-bg-canvas" />
        </Suspense>
      </div>

      {/* ── Frosted-glass header ── */}
      <header className="pact-header glass-header">
        <span className="header-pact">PACT</span>
        <div className="header-right">
          <div className="operator-tag">
            <span className="operator-label">Operator</span>
            <span className="operator-name">
              {user?.first_name?.toUpperCase()} {user?.last_name?.[0]?.toUpperCase()}.
            </span>
          </div>
          <button className="btn-logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main className="pact-main">
        {loadError === 'not_enrolled' ? (
          <div className="not-enrolled">
            <h2>Not Enrolled</h2>
            <p>You are not enrolled in the PACT course. Contact your instructor to be added to a cohort.</p>
          </div>
        ) : loadError ? (
          <div className="not-enrolled">
            <h2>Load Error</h2>
            <p>Could not load course data. Try refreshing the page.</p>
          </div>
        ) : (
          <>
            {/* ── Stats banner ── */}
            <div className="stats-banner">
              <div className="stat-glass">
                <div className="stat-glass-value">{unlocked}</div>
                <div className="stat-glass-label">Unlocked</div>
              </div>
              <div className="stat-glass">
                <div className="stat-glass-value" style={{ color: '#10b981' }}>{completed}</div>
                <div className="stat-glass-label">Completed</div>
              </div>
              <div className="stat-glass">
                <div className="stat-glass-value" style={{ color: '#f59e0b' }}>{inProgress}</div>
                <div className="stat-glass-label">In Progress</div>
              </div>
              {enrollment?.cohort && (
                <div className="stat-glass stat-glass-cohort">
                  <div className="stat-glass-value" style={{ fontSize: 18 }}>
                    {enrollment.cohort.name}
                  </div>
                  <div className="stat-glass-label">
                    Cohort{enrollment.squad ? ` · Squad ${enrollment.squad.number}` : ''}
                  </div>
                </div>
              )}
            </div>

            {/* ── Squad ── */}
            {enrollment?.squad && (
              <div className="glass-card squad-card" style={{ marginBottom: 28 }}>
                <div className="squad-number">
                  Squad {enrollment.squad.number}
                  {enrollment.squad.name ? ` · ${enrollment.squad.name}` : ''}
                </div>
                <div className="squad-members">
                  {(enrollment.squad.students ?? []).map((m) => (
                    <div
                      key={m.id}
                      className={`squad-member${m.id === user?.id ? ' squad-member-self' : ''}`}
                    >
                      <div className="member-avatar">
                        {m.first_name?.[0]}{m.last_name?.[0]}
                      </div>
                      <span>
                        {m.first_name} {m.last_name}
                        {m.id === user?.id ? ' (you)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Assignments ── */}
            <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 0 }}>
              <div className="section-header" style={{ border: 'none', paddingBottom: 0, marginBottom: 16 }}>
                <h2>Mission Assignments</h2>
                <span className="section-count">{unlocked} unlocked</span>
              </div>

              {assignments.length > 0 && (
                <div className="day-tabs" style={{ marginBottom: 20 }}>
                  {visibleTabs.map((t) => (
                    <button
                      key={t.key}
                      className={`day-tab${activeTab === t.key ? ' active' : ''}`}
                      style={activeTab === t.key && t.key !== 'all'
                        ? { background: TYPE_COLOR[t.key], borderColor: TYPE_COLOR[t.key], boxShadow: `0 4px 12px ${TYPE_COLOR[t.key]}55` }
                        : {}}
                      onClick={() => setActiveTab(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {visible.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  {assignments.length === 0
                    ? 'No assignments yet. Your instructor will unlock missions for your cohort.'
                    : 'No assignments in this category.'}
                </div>
              ) : (
                <div className="assignment-grid">
                  {visible.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      onClick={() => navigate(`/assignment/${a.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function AssignmentCard({ assignment: a, onClick }) {
  const locked = a.is_unlocked === false;
  const color  = TYPE_COLOR[a.type] ?? TYPE_COLOR.module;

  return (
    <div
      className={`assignment-card${locked ? ' assignment-locked' : ''}`}
      style={{ '--type-color': color }}
      onClick={!locked ? onClick : undefined}
      role={!locked ? 'button' : undefined}
      tabIndex={!locked ? 0 : undefined}
      onKeyDown={!locked ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="assignment-card-top">
        <div className="assignment-badges">
          <span className="type-badge" style={{ '--type-color': color }}>
            {(a.type ?? 'module').toUpperCase()}
          </span>
          {a.grading_mode === 'squad' && <span className="squad-badge">Squad</span>}
        </div>
        {locked && <span className="lock-icon">🔒</span>}
      </div>
      <div className="assignment-card-title">{a.title}</div>
      {a.description && (
        <p className="assignment-card-desc">
          {a.description.length > 90 ? a.description.slice(0, 90) + '…' : a.description}
        </p>
      )}
      {a.due_date && (
        <div className="assignment-due">Due {new Date(a.due_date).toLocaleDateString()}</div>
      )}
      {locked ? (
        <div className="locked-msg">Not yet unlocked for your cohort</div>
      ) : (
        <div className="card-footer">
          <div className="mini-bar">
            <div className="mini-bar-fill" style={{ width: `${a.progress ?? 0}%`, background: color }} />
          </div>
          <span className="mini-pct">{a.progress ?? 0}%</span>
        </div>
      )}
    </div>
  );
}
