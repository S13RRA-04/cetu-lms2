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

const DAY_TABS = [
  { key: 'all',  label: 'All' },
  { key: 'day1', label: 'Day 1' },
  { key: 'day2', label: 'Day 2' },
  { key: 'day3', label: 'Day 3' },
  { key: 'day4', label: 'Day 4' },
  { key: 'day5', label: 'Day 5' },
  { key: 'assess',   label: 'Assessments' },
  { key: 'scenario', label: 'Scenario' },
];

function assignmentDay(a) {
  const oi = a.order_index ?? 99;
  if (oi <= 7)  return 'day1';
  if (oi <= 11) return 'day2';
  if (oi <= 14) return 'day3';
  if (oi <= 19) return 'day4';
  if (oi <= 21) return 'day5';
  if (oi <= 24) return 'assess';
  return 'scenario';
}

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
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  const unlocked   = assignments.filter((a) => a.is_unlocked !== false).length;
  const completed  = assignments.filter((a) => (a.progress ?? 0) >= 100).length;
  const inProgress = assignments.filter((a) => (a.progress ?? 0) > 0 && (a.progress ?? 0) < 100).length;

  const visible = activeTab === 'all'
    ? assignments
    : assignments.filter((a) => assignmentDay(a) === activeTab);

  return (
    <div className="pact-layout">
      <header className="pact-header">
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
            {/* ── Globe + Stats ── */}
            <div className="globe-section">
              <div className="globe-card">
                <Suspense fallback={<div className="globe-canvas-wrap" style={{ background: '#fff' }} />}>
                  <Globe className="globe-canvas-wrap" />
                </Suspense>
                <div className="globe-label">
                  <div className="globe-label-main">PACT Network</div>
                  <div className="globe-label-sub">Drag to rotate</div>
                </div>
              </div>

              <div className="globe-stats">
                <div className="stat-card">
                  <div className="stat-value">{unlocked}</div>
                  <div className="stat-label">Unlocked missions</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--green)' }}>{completed}</div>
                  <div className="stat-label">Completed</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value" style={{ color: 'var(--warning)' }}>{inProgress}</div>
                  <div className="stat-label">In progress</div>
                </div>
                {enrollment && (
                  <div className="stat-card">
                    <div className="stat-value" style={{ fontSize: 22, paddingTop: 4 }}>
                      {enrollment.cohort?.name ?? '—'}
                    </div>
                    <div className="stat-label">Cohort</div>
                    {enrollment.squad && (
                      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--primary)', fontFamily: 'var(--mono)', letterSpacing: '.1em' }}>
                        Squad {enrollment.squad.number}
                        {enrollment.squad.name ? ` · ${enrollment.squad.name}` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Cohort + Squad ── */}
            {enrollment?.squad && (
              <div className="info-row">
                <div className="squad-card">
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
              </div>
            )}

            {/* ── Assignments ── */}
            <div className="section-header">
              <h2>Mission Assignments</h2>
              <span className="section-count">{unlocked} unlocked</span>
            </div>

            {assignments.length > 0 && (
              <div className="day-tabs">
                {DAY_TABS.map((t) => (
                  <button
                    key={t.key}
                    className={`day-tab${activeTab === t.key ? ' active' : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {visible.length === 0 ? (
              <div className="empty-state">
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
          {a.grading_mode === 'squad' && (
            <span className="squad-badge">Squad</span>
          )}
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
        <div className="assignment-due">
          Due {new Date(a.due_date).toLocaleDateString()}
        </div>
      )}

      {locked ? (
        <div className="locked-msg">Not yet unlocked for your cohort</div>
      ) : (
        <div className="card-footer">
          <div className="mini-bar">
            <div
              className="mini-bar-fill"
              style={{ width: `${a.progress ?? 0}%`, background: color }}
            />
          </div>
          <span className="mini-pct">{a.progress ?? 0}%</span>
        </div>
      )}
    </div>
  );
}
