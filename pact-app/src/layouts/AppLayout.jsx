import { useState, useEffect, lazy, Suspense } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import { logout } from '../api/pact.js';

const SQUAD_THEME = {
  1: { primary: '#ff073a', binary: '#27f5ff', lt: '#fff0f3', md: 'rgba(255,7,58,0.14)'   }, // neon red
  2: { primary: '#ffe600', binary: '#7c3cff', lt: '#fffde6', md: 'rgba(255,230,0,0.14)'  }, // neon yellow
  3: { primary: '#39ff14', binary: '#ff4fd8', lt: '#f0fff0', md: 'rgba(57,255,20,0.14)'  }, // neon green
  4: { primary: '#00b0ff', binary: '#ffb020', lt: '#e6f7ff', md: 'rgba(0,176,255,0.14)'  }, // neon blue
};

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
  const location          = useLocation();
  const [collapsed, setCollapsed]       = useState({});
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const isAdmin   = user?.role === 'admin' || user?.role === 'instructor';
  const squadNum  = enrollment?.squad?.number ? Number(enrollment.squad.number) : null;
  const squadTheme = SQUAD_THEME[squadNum];

  useEffect(() => {
    const root  = document.documentElement;
    const theme = squadTheme;
    if (theme) {
      root.style.setProperty('--primary',    theme.primary);
      root.style.setProperty('--primary-lt', theme.lt);
      root.style.setProperty('--primary-md', theme.md);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-lt');
      root.style.removeProperty('--primary-md');
    }
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--primary-lt');
      root.style.removeProperty('--primary-md');
    };
  }, [squadTheme]);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    navigate('/login');
  };

  const toggleGroup = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  // Group assignments by type
  const groups = TYPE_ORDER.reduce((acc, type) => {
    const items = assignments.filter((a) => a.type === type && a.is_unlocked !== false);
    if (items.length) acc.push({ type, items });
    return acc;
  }, []);

  return (
    <div className="app-shell">
      {/* Globe background — behind everything */}
      <div className="globe-bg" aria-hidden="true">
        <Suspense fallback={null}>
          <Globe
            className="globe-bg-canvas"
            primaryColor={squadTheme?.primary ?? '#00b0ff'}
            binaryAccentColor={squadTheme?.binary ?? '#ffb020'}
          />
        </Suspense>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
        style={squadTheme ? {
          background:  `${squadTheme.primary}14`,
          borderRight: `1px solid ${squadTheme.primary}28`,
        } : {}}
      >
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
          <NavLink to="/scenarios" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">⬡</span> Scenarios
          </NavLink>
          <NavLink to="/course-content" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <span className="sidebar-icon">◈</span> Course Content
          </NavLink>

          {/* Mission assignments */}
          <div className="sidebar-section-label">MISSIONS</div>
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

          {/* Admin section */}
          {isAdmin && (
            <>
              <div className="sidebar-section-label">ADMIN</div>
              <NavLink to="/admin" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="sidebar-icon">◉</span> Admin Dashboard
              </NavLink>
            </>
          )}
        </nav>

        {/* User + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" style={squadTheme ? { borderColor: squadTheme.primary, boxShadow: `0 0 10px ${squadTheme.primary}55` } : {}}>
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
          <div key={location.pathname} className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
