import { Outlet, useNavigate, useParams, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from '../store/authStore.js';
import { listEnvironments, logout } from '../api/kcr.js';

export default function AppShell() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const { eid } = useParams();
  const [envs, setEnvs] = useState([]);

  useEffect(() => {
    listEnvironments().then(setEnvs).catch(() => {});
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    setUser(null);
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'instructor';

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">KCR</div>
          <div className="sidebar-tagline">Kinetic Cyber Range Ops</div>
        </div>

        <div className="sidebar-body">
          <div className="sidebar-section-label">Environments</div>
          {envs.map((env) => (
            <NavLink
              key={env.id}
              to={`/env/${env.id}`}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
            >
              <span className="sidebar-item-icon">🎯</span>
              {env.name}
            </NavLink>
          ))}

          <div style={{ marginTop: 12 }}>
            <NavLink to="/" end className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}>
              <span className="sidebar-item-icon">⊞</span>
              All Environments
            </NavLink>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-chip-name">{user?.name ?? user?.email}</div>
              <div className="user-chip-role">{user?.role}</div>
            </div>
            <button className="btn-logout" onClick={handleLogout} title="Sign out">⏻</button>
          </div>
        </div>
      </nav>

      <div className="main-content">
        <Outlet context={{ envs, setEnvs, isAdmin }} />
      </div>
    </div>
  );
}
