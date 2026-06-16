import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  motion, AnimatePresence,
  useMotionValue, useSpring, useTransform,
} from 'motion/react';
import useAuthStore from '../store/authStore.js';
import { logout } from '../api/pact.js';

// Squad theme: keyed by squad.number mod 4 (1-4)
const SQUAD_THEME = {
  1: { primary: '#ef4444', lt: '#fff0f0', md: 'rgba(239,68,68,0.14)'   }, // Redstone — red
  2: { primary: '#f59e0b', lt: '#fffde6', md: 'rgba(245,158,11,0.14)'  }, // Dogwood — amber
  3: { primary: '#3b82f6', lt: '#eff6ff', md: 'rgba(59,130,246,0.14)'  }, // CyberDyne — blue
  4: { primary: '#8b5cf6', lt: '#f5f3ff', md: 'rgba(139,92,246,0.14)'  }, // PixelPlay — purple
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

const ICON_BASE = 44;
const ICON_PEAK = 68;
const MAG_RANGE = 140;

// ── Spring-magnified dock icon ────────────────────────────────────────────────
function DockIcon({ mouseY, onClick, isActive, label, children, accent }) {
  const ref = useRef(null);

  const distance = useTransform(mouseY, (val) => {
    const b = ref.current?.getBoundingClientRect();
    if (!b) return 9999;
    return val - (b.top + b.height / 2);
  });

  const sizeRaw = useTransform(
    distance,
    [-MAG_RANGE, 0, MAG_RANGE],
    [ICON_BASE, ICON_PEAK, ICON_BASE],
  );
  const size = useSpring(sizeRaw, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <div className="dock-item-wrap">
      <motion.button
        ref={ref}
        onClick={onClick}
        className={`dock-icon${isActive ? ' dock-icon-active' : ''}`}
        style={{
          width: size,
          height: size,
          '--accent': accent,
        }}
        whileTap={{ scale: 0.88 }}
      >
        {children}
        {isActive && <span className="dock-active-dot" />}
      </motion.button>
      <span className="dock-label">{label}</span>
    </div>
  );
}

// ── Main layout ───────────────────────────────────────────────────────────────
export default function AppLayout({ assignments = [], enrollment = null }) {
  const { user, setUser } = useAuthStore();
  const navigate          = useNavigate();
  const location          = useLocation();

  const [missionsOpen, setMissionsOpen] = useState(false);
  const [collapsed, setCollapsed]       = useState({});
  const [sidebarOpen, setSidebarOpen]   = useState(false); // mobile

  const mouseY  = useMotionValue(0);
  const dockRef = useRef(null);

  const isAdmin   = user?.role === 'admin' || user?.role === 'instructor';
  const squadNum   = enrollment?.squad?.number ? ((Number(enrollment.squad.number) - 1) % 4) + 1 : null;
  const squadTheme = squadNum ? SQUAD_THEME[squadNum] : null;
  const accent     = squadTheme?.primary ?? '#00b0ff';

  useEffect(() => {
    const root = document.documentElement;
    if (squadTheme) {
      root.style.setProperty('--primary',    squadTheme.primary);
      root.style.setProperty('--primary-lt', squadTheme.lt);
      root.style.setProperty('--primary-md', squadTheme.md);
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

  useEffect(() => {
    const handler = (e) => mouseY.set(e.clientY);
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [mouseY]);

  // Close missions panel on route change
  useEffect(() => { setMissionsOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    navigate('/login');
  };

  const toggleGroup = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  // Group unlocked assignments by drop_number (null = untagged, shown last)
  const unlockedAssignments = assignments.filter((a) => a.is_unlocked !== false);
  const dropNums = [...new Set(unlockedAssignments.map((a) => a.drop_number))].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });
  const groups = dropNums.map((num) => ({
    drop: num,
    items: unlockedAssignments.filter((a) => a.drop_number === num),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="app-shell">
      {/* Globe background */}
      <div className="globe-bg">
        <Suspense fallback={null}>
          <Globe className="globe-bg-canvas" accentColor={accent} interactive={true} />
        </Suspense>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── macOS-style dock sidebar ── */}
      <nav
        ref={dockRef}
        className={`dock-sidebar${sidebarOpen ? ' dock-sidebar-open' : ''}`}
        style={{ '--accent': accent }}
      >
        {/* Brand */}
        <div className="dock-brand" style={{ color: accent, textShadow: `0 0 18px ${accent}` }}>
          PACT
        </div>

        <div className="dock-icons">
          {/* Dashboard */}
          <DockIcon mouseY={mouseY} accent={accent}
            label="Dashboard"
            isActive={location.pathname === '/'}
            onClick={() => { navigate('/'); setSidebarOpen(false); setMissionsOpen(false); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </DockIcon>

          {/* Grades */}
          <DockIcon mouseY={mouseY} accent={accent}
            label="Grades"
            isActive={location.pathname.startsWith('/grades')}
            onClick={() => { navigate('/grades'); setSidebarOpen(false); setMissionsOpen(false); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </DockIcon>

          {/* Scoreboard */}
          <DockIcon mouseY={mouseY} accent={accent}
            label="Scoreboard"
            isActive={location.pathname.startsWith('/scoreboard')}
            onClick={() => { navigate('/scoreboard'); setSidebarOpen(false); setMissionsOpen(false); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 20v-8"/>
              <path d="M12 20V8"/>
              <path d="M18 20V4"/>
              <rect x="4" y="16" width="4" height="4" rx="1"/>
              <rect x="10" y="8" width="4" height="12" rx="1"/>
              <rect x="16" y="4" width="4" height="16" rx="1"/>
            </svg>
          </DockIcon>

          {/* Scenarios */}
          <DockIcon mouseY={mouseY} accent={accent}
            label="Scenarios"
            isActive={location.pathname.startsWith('/scenarios')}
            onClick={() => { navigate('/scenarios'); setSidebarOpen(false); setMissionsOpen(false); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </DockIcon>

          {/* Course Content */}
          <DockIcon mouseY={mouseY} accent={accent}
            label="Course Content"
            isActive={location.pathname.startsWith('/course-content')}
            onClick={() => { navigate('/course-content'); setSidebarOpen(false); setMissionsOpen(false); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
          </DockIcon>


          {/* Missions */}
          {groups.length > 0 && (
            <DockIcon mouseY={mouseY} accent={accent}
              label="Missions"
              isActive={missionsOpen || location.pathname.startsWith('/assignment')}
              onClick={() => { setMissionsOpen((v) => !v); setSidebarOpen(false); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </DockIcon>
          )}

          {/* Admin */}
          {isAdmin && (
            <DockIcon mouseY={mouseY} accent={accent}
              label="Admin"
              isActive={location.pathname.startsWith('/admin')}
              onClick={() => { navigate('/admin'); setSidebarOpen(false); setMissionsOpen(false); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </DockIcon>
          )}
        </div>

        {/* User avatar at bottom */}
        <button
          className="dock-avatar"
          style={{ borderColor: accent, boxShadow: `0 0 10px ${accent}55`, color: accent }}
          onClick={handleLogout}
          title={`${user?.first_name} ${user?.last_name} — Sign out`}
        >
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </button>
      </nav>

      {/* ── Missions flyout panel ── */}
      <AnimatePresence>
        {missionsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="missions-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setMissionsOpen(false)}
            />

            {/* Genie panel */}
            <motion.div
              className="missions-panel"
              style={{ '--accent': accent }}
              initial={{
                x: -24,
                scaleX: 0.12,
                scaleY: 0.06,
                opacity: 0,
                originX: 0,
                originY: 0.5,
              }}
              animate={{
                x: 0,
                scaleX: 1,
                scaleY: 1,
                opacity: 1,
                originX: 0,
                originY: 0.5,
              }}
              exit={{
                x: -24,
                scaleX: 0.12,
                scaleY: 0.06,
                opacity: 0,
                originX: 0,
                originY: 0.5,
              }}
              transition={{
                scaleX: { type: 'spring', stiffness: 320, damping: 26 },
                scaleY: { type: 'spring', stiffness: 260, damping: 22, delay: 0.025 },
                x:      { type: 'spring', stiffness: 320, damping: 26 },
                opacity: { duration: 0.14 },
              }}
            >
              <div className="missions-panel-header">
                <span className="missions-panel-title" style={{ color: accent }}>MISSIONS</span>
                <button className="missions-panel-close" onClick={() => setMissionsOpen(false)}>✕</button>
              </div>

              <div className="missions-panel-body">
                {groups.map(({ drop, items }) => {
                  const key = drop ?? 'untagged';
                  const label = drop != null ? `DROP ${drop}` : 'GENERAL';
                  return (
                    <div key={key} className="missions-group">
                      <button
                        className={`missions-group-btn${collapsed[key] ? ' collapsed' : ''}`}
                        onClick={() => toggleGroup(key)}
                      >
                        <span
                          className="missions-group-dot"
                          style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                        />
                        <span className="missions-group-name">{label}</span>
                        <span className="missions-group-count">{items.length}</span>
                        <span className="missions-group-chevron">›</span>
                      </button>

                      <div className={`missions-group-items${collapsed[key] ? '' : ' expanded'}`}>
                        <div className="missions-group-items-inner">
                          {items.map((a) => {
                            const done = (a.progress ?? 0) >= 100;
                            return (
                              <NavLink
                                key={a.id}
                                to={`/assignment/${a.id}`}
                                className={({ isActive }) =>
                                  `missions-assignment${isActive ? ' active' : ''}${done ? ' missions-assignment-done' : ''}`
                                }
                                onClick={() => setMissionsOpen(false)}
                              >
                                <span className="missions-a-title">{a.title}</span>
                                {done ? (
                                  <span className="missions-a-check">✓</span>
                                ) : (
                                  (a.progress ?? 0) > 0 && (
                                    <span
                                      className="missions-a-progress"
                                      style={{ width: `${a.progress}%`, background: TYPE_COLOR[a.type] }}
                                    />
                                  )
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="app-content">
        {/* Mobile topbar */}
        <div className="app-topbar">
          <button className="topbar-hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
          <span className="topbar-brand" style={{ color: accent }}>PACT</span>
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
