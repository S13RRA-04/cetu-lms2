import { useState, useEffect, lazy, Suspense, memo } from 'react';
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import useAuthStore from '../store/authStore.js';
import { logout } from '../api/pact.js';
import { getVictim } from '../constants/victims.js';
import DataStream from '../components/DataStream.jsx';

const Globe = lazy(() => import('../components/Globe.jsx'));

const SQUAD_THEME = {
  1: { primary: '#ef4444', lt: '#fff0f0', md: 'rgba(239,68,68,0.14)'  },
  2: { primary: '#f59e0b', lt: '#fffde6', md: 'rgba(245,158,11,0.14)' },
  3: { primary: '#3b82f6', lt: '#eff6ff', md: 'rgba(59,130,246,0.14)' },
  4: { primary: '#8b5cf6', lt: '#f5f3ff', md: 'rgba(139,92,246,0.14)' },
};

/* ── Live clock ────────────────────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString('en-US', { hour12: false });
    setTime(fmt());
    const id = setInterval(() => setTime(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return <>{time}</>;
}

/* ── Nav item ──────────────────────────────────────────────────────────────── */
function OpsNavItem({ to, label, end = false, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `ops-nav-item${isActive ? ' ops-nav-active' : ''}`}
    >
      <span className="ops-nav-icon">{children}</span>
      <span className="ops-nav-label">{label}</span>
      <span className="ops-nav-bar" />
    </NavLink>
  );
}

/* ── SVG icons ─────────────────────────────────────────────────────────────── */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

const IcGrid   = () => <svg viewBox="0 0 24 24" {...S}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
const IcFolder = () => <svg viewBox="0 0 24 24" {...S}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>;
const IcBook   = () => <svg viewBox="0 0 24 24" {...S}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
const IcChart  = () => <svg viewBox="0 0 24 24" {...S}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
const IcPodium = () => <svg viewBox="0 0 24 24" {...S}><rect x="4" y="14" width="4" height="7" rx="1"/><rect x="10" y="9" width="4" height="12" rx="1"/><rect x="16" y="11" width="4" height="10" rx="1"/></svg>;
const IcShield = () => <svg viewBox="0 0 24 24" {...S}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcLogout = () => <svg viewBox="0 0 24 24" {...S}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

/* ── HUD bar ────────────────────────────────────────────────────────────────── */
const HudBar = memo(function HudBar({ accent, squad }) {
  return (
    <div className="ops-hud">
      <span className="ops-hud-op">OPERATION BRKR</span>
      <span className="ops-hud-div">·</span>
      <span className="ops-hud-status">
        <motion.span
          className="ops-hud-led"
          style={{ background: accent }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
        SECURE
      </span>
      {squad && (
        <>
          <span className="ops-hud-div">·</span>
          <span className="ops-hud-squad" style={{ color: accent }}>SQUAD {squad.number}</span>
        </>
      )}
      <span className="ops-hud-spacer" />
      <span className="ops-hud-clock"><LiveClock /></span>
    </div>
  );
});

/* ── Investigation target card ──────────────────────────────────────────────── */
function TargetCard({ squad, enrollment, accent }) {
  const victim   = squad ? getVictim(squad.number) : null;
  const revealed = !!enrollment?.cohort?.target_revealed;

  if (!squad) return null;

  const vc = (revealed && victim) ? victim.color : '#f59e0b';

  return (
    <div className="ops-target-card" style={{ borderColor: `${vc}35`, position: 'relative', overflow: 'hidden' }}>
      {revealed && victim && (
        <DataStream color={victim.color} opacity={0.055} fontSize={9} speedScale={0.7} />
      )}
      <div className="ops-target-header" style={{ background: vc }}>
        <span>{revealed ? 'TARGET ACQUIRED' : 'PENDING ASSIGNMENT'}</span>
        <span>SQ {squad.number}</span>
      </div>
      <div className="ops-target-body">
        {revealed && victim ? (
          <>
            <div className="ops-target-name" style={{ color: vc }}>{victim.name}</div>
            <div className="ops-target-sector">{victim.sector}</div>
            <div className="ops-target-code">{victim.code}</div>
          </>
        ) : (
          <>
            <div className="ops-target-redacted">████████████████</div>
            <div className="ops-target-pending">
              <motion.span
                style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', marginRight: 5 }}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              AWAITING AUTHORIZATION
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Drop status strip ──────────────────────────────────────────────────────── */
function DropStrip({ assignments, accent }) {
  const dropNums = [...new Set(
    assignments.filter((a) => a.drop_number != null).map((a) => a.drop_number)
  )].sort((a, b) => a - b);

  if (!dropNums.length) return null;

  const unlockedNums = new Set(
    assignments.filter((a) => a.is_unlocked !== false && a.drop_number != null).map((a) => a.drop_number)
  );

  return (
    <div className="ops-drop-strip">
      <div className="ops-rail-section-label">INTEL DROPS</div>
      <div className="ops-drop-pills">
        {dropNums.map((n) => {
          const active = unlockedNums.has(n);
          return (
            <span key={n} className={`ops-drop-pill${active ? ' ops-drop-pill-active' : ''}`}
              style={active ? { background: accent, color: '#000' } : {}}>
              DROP {n}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main layout ────────────────────────────────────────────────────────────── */
export default function AppLayout({ assignments = [], enrollment = null }) {
  const { user, setUser } = useAuthStore();
  const navigate          = useNavigate();
  const location          = useLocation();

  const squadNum   = enrollment?.squad?.number ? ((Number(enrollment.squad.number) - 1) % 4) + 1 : null;
  const squadTheme = squadNum ? SQUAD_THEME[squadNum] : null;
  const accent     = squadTheme?.primary ?? '#00b0ff';
  const squad      = enrollment?.squad ?? null;
  const isAdmin  = user?.role === 'admin' || user?.role === 'instructor';

  /* Apply squad theme CSS vars */
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

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    navigate('/login');
  };

  return (
    <div className="ops-room">

      {/* Globe behind the right pane only */}
      <div className="ops-globe-bg">
        <Suspense fallback={null}>
          <Globe accentColor={accent} interactive={false} />
        </Suspense>
      </div>

      {/* ── Left rail ── */}
      <aside className="ops-left-rail" style={{ '--accent': accent }}>

        {/* Brand */}
        <div className="ops-brand">
          <div className="ops-brand-word" style={{ color: accent, textShadow: `0 0 22px ${accent}88` }}>
            PACT
          </div>
          <div className="ops-brand-sub">OPERATION BRKR</div>
        </div>

        {/* Investigation target */}
        <TargetCard squad={squad} enrollment={enrollment} accent={accent} />

        {/* Navigation */}
        <nav className="ops-nav">
          <div className="ops-rail-section-label">NAVIGATION</div>

          <OpsNavItem to="/" label="OPERATIONS" end>
            <IcGrid />
          </OpsNavItem>

          <OpsNavItem to="/scenarios" label="CASE FILE">
            <IcFolder />
          </OpsNavItem>

          <OpsNavItem to="/course-content" label="INTEL LIBRARY">
            <IcBook />
          </OpsNavItem>

          <OpsNavItem to="/grades" label="OPERATOR RECORD">
            <IcChart />
          </OpsNavItem>

          <OpsNavItem to="/scoreboard" label="STANDINGS">
            <IcPodium />
          </OpsNavItem>

          {isAdmin && (
            <OpsNavItem to="/admin" label="COMMAND">
              <IcShield />
            </OpsNavItem>
          )}
        </nav>

        {/* Drop status */}
        <DropStrip assignments={assignments} accent={accent} />

        <div className="ops-rail-spacer" />

        {/* Operator identity + logout */}
        <div className="ops-operator">
          <div className="ops-op-avatar" style={{ borderColor: accent, color: accent }}>
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="ops-op-info">
            <div className="ops-op-name">{user?.first_name} {user?.last_name}</div>
            <div className="ops-op-role">
              {user?.role === 'admin' ? 'ADMINISTRATOR' : user?.role === 'instructor' ? 'INSTRUCTOR' : 'OPERATOR'}
            </div>
          </div>
          <button className="ops-logout-btn" onClick={handleLogout} title="Sign out">
            <IcLogout />
          </button>
        </div>
      </aside>

      {/* ── Right content pane ── */}
      <div className="ops-right-pane">

        <HudBar accent={accent} squad={squad} />

        <main className="ops-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{ minHeight: '100%' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
