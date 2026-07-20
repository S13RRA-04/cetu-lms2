import { useState } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import { logout } from '../api/lair.js';

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
  const location          = useLocation();
  const [collapsed, setCollapsed]       = useState({});
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const isAdmin   = user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'superadmin';

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    navigate('/login');
  };

  const toggleGroup = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const groups = TYPE_ORDER.reduce((acc, type) => {
    const items = assignments.filter((a) => a.type === type && a.is_unlocked !== false);
    if (items.length) acc.push({ type, items });
    return acc;
  }, []);

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-text">LAIR</span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">⬡</span> Dashboard
          </NavLink>
          <NavLink to="/grades" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">◈</span> Grades
          </NavLink>
          <NavLink to="/scoreboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">◇</span> Scoreboard
          </NavLink>
          <NavLink to="/scenarios" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">⬡</span> Scenarios
          </NavLink>
          <NavLink to="/course-content" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">◈</span> Course Content
          </NavLink>

          <div className="sidebar-section-label">Course Sections</div>
          {groups.map(({ type, items }) => (
            <div key={type}>
              <button
                className={`sidebar-group-btn${collapsed[type] ? ' collapsed' : ''}`}
                onClick={() => toggleGroup(type)}
              >
                <span className="sidebar-group-dot" style={{ background: TYPE_COLOR[type], boxShadow: `0 0 6px ${TYPE_COLOR[type]}` }} />
                <span className="sidebar-group-name">{type.toUpperCase()}</span>
                <span className="sidebar-group-count">{items.length}</span>
                <span className="sidebar-chevron">›</span>
              </button>
              <div className={`sidebar-group-items${collapsed[type] ? '' : ' expanded'}`}>
                <div className="sidebar-group-items-inner">
                  {items.map((a) => (
                    <NavLink
                      key={a.id}
                      to={`/assignment/${a.id}`}
                      className={({ isActive }) => `sidebar-assignment${isActive ? ' active' : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sidebar-a-title">{a.title}</span>
                      {(a.progress ?? 0) > 0 && (
                        <span
                          className="sidebar-a-progress"
                          style={{ width: `${a.progress}%`, background: TYPE_COLOR[a.type] }}
                        />
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {isAdmin && (
            <>
              <div className="sidebar-section-label">ADMIN</div>
              <NavLink to="/admin" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-icon">◉</span> Admin Dashboard
              </NavLink>
            </>
          )}
        </nav>

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

      <div className="app-content">
        <div className="app-topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="topbar-brand">LAIR</span>
        </div>

        <main className="app-main">
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
