import { useState, lazy, Suspense } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import { logout } from '../api/pact.js';

const Globe = lazy(() => import('../components/Globe.jsx'));

const TYPE_COLOR = {
  module:     '#60a5fa',
  game:       '#34d399',
  assessment: '#fbbf24',
  survey:     '#a78bfa',
  challenge:  '#f87171',
  capstone:   '#fb923c',
};

const TYPE_ORDER = ['module', 'challenge', 'capstone', 'assessment', 'survey', 'game'];

export default function AppLayout({ assignments = [], enrollment = null }) {
  const { user, setUser } = useAuthStore();
  const navigate          = useNavigate();
  const [collapsed, setCollapsed]       = useState({});
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'instructor';

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    navigate('/login');
  };

  const toggleGroup = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  // Group assignments by type
  const groups = TYPE_ORDER.reduce((acc, type) => {
    const items = assignments.filter((a) => a.type === type);
    if (items.length) acc.push({ type, items });
    return acc;
  }, []);

  return (
    <div className="app-shell">
      {/* Globe background — behind everything */}
      <div className="globe-bg" aria-hidden="true">
        <Suspense fallback={null}>
          <Globe className="globe-bg-canvas" />
        </Suspense>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-text">PACT</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-nav">
          {/* Primary links */}
          <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">⬡</span> Dashboard
          </NavLink>
          <NavLink to="/grades" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">◈</span> Grades
          </NavLink>
          <NavLink to="/scoreboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">◇</span> Scoreboard
          </NavLink>

          {/* Mission assignments */}
          <div className="sidebar-section-label">MISSIONS</div>
          {groups.map(({ type, items }) => (
            <div key={type}>
              <button
                className="sidebar-group-btn"
                onClick={() => toggleGroup(type)}
              >
                <span className="sidebar-group-dot" style={{ background: TYPE_COLOR[type] }} />
                <span className="sidebar-group-name">{type.toUpperCase()}</span>
                <span className="sidebar-group-count">{items.length}</span>
                <span className="sidebar-chevron">{collapsed[type] ? '›' : '⌄'}</span>
              </button>
              {!collapsed[type] && (
                <div className="sidebar-group-items">
                  {items.map((a) => {
                    const locked = a.is_unlocked === false;
                    return (
                      <NavLink
                        key={a.id}
                        to={`/assignment/${a.id}`}
                        className={({ isActive }) =>
                          `sidebar-assignment${isActive ? ' active' : ''}${locked ? ' locked' : ''}`
                        }
                        onClick={() => setSidebarOpen(false)}
                      >
                        <span className="sidebar-a-title">{a.title}</span>
                        {locked && <span className="sidebar-a-lock">🔒</span>}
                        {!locked && (a.progress ?? 0) > 0 && (
                          <span
                            className="sidebar-a-progress"
                            style={{
                              width: `${a.progress}%`,
                              background: TYPE_COLOR[a.type],
                            }}
                          />
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="sidebar-section-label">ADMIN</div>
              <NavLink to="/admin" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-icon">◉</span> Grade Center
              </NavLink>
            </>
          )}
        </nav>

        {/* User + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="app-content">
        {/* Mobile topbar */}
        <div className="app-topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="topbar-brand">PACT</span>
        </div>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
