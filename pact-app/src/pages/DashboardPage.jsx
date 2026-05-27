import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyEnrollment, getAssignments, logout } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';

const TYPE_COLOR = {
  module:     '#00d4ff',
  game:       '#00e676',
  assessment: '#ffab00',
  survey:     '#a78bfa',
  challenge:  '#ff7043',
  capstone:   '#ffd740',
};

export default function DashboardPage() {
  const { user, setUser } = useAuthStore();
  const navigate          = useNavigate();
  const [enrollment,  setEnrollment]  = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState(null);

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

  const unlocked = assignments.filter((a) => a.is_unlocked !== false).length;

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
            {/* ── Cohort + Squad ── */}
            {enrollment && (
              <div className="info-row">
                <div className="cohort-card">
                  <div className="info-label">Cohort</div>
                  <div className="info-value">{enrollment.cohort?.name ?? '—'}</div>
                  {(enrollment.cohort?.start_date || enrollment.cohort?.end_date) && (
                    <div className="info-dates">
                      {enrollment.cohort.start_date
                        ? new Date(enrollment.cohort.start_date).toLocaleDateString()
                        : '?'}
                      {' — '}
                      {enrollment.cohort.end_date
                        ? new Date(enrollment.cohort.end_date).toLocaleDateString()
                        : 'ongoing'}
                    </div>
                  )}
                </div>

                {enrollment.squad ? (
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
                ) : (
                  <div className="squad-card squad-unassigned">
                    <div className="squad-number">Squad Unassigned</div>
                    <p className="info-muted">Your instructor will assign you to a squad.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Assignments ── */}
            <div className="section-header">
              <h2>Mission Assignments</h2>
              <span className="section-count">{unlocked} unlocked</span>
            </div>

            {assignments.length === 0 ? (
              <div className="empty-state">
                No assignments yet. Your instructor will unlock missions for your cohort.
              </div>
            ) : (
              <div className="assignment-grid">
                {assignments.map((a) => (
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
          <span className="type-badge" style={{ color, borderColor: color }}>
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
