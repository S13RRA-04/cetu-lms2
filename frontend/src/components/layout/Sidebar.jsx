import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';

const ICONS = {
  dashboard: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  courses: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  lti: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  ),
  grades: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  profile: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user && ['admin', 'superadmin'].includes(user.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        CETU LMS
        <span>Learning Management System</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {ICONS.dashboard} Dashboard
        </NavLink>
        <NavLink to="/courses" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {ICONS.courses} Courses
        </NavLink>
        <NavLink to="/grades" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          {ICONS.grades} My Grades
        </NavLink>

        {isAdmin && (
          <>
            <div className="nav-section-label">Administration</div>
            <NavLink to="/users" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {ICONS.users} Users
            </NavLink>
            <NavLink to="/admin/lti" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              {ICONS.lti} LTI Platforms
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
          <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} style={{ color: 'rgba(255,255,255,.75)' }}>
          {ICONS.profile} My Profile
        </NavLink>
      <button className="nav-item" onClick={handleLogout} style={{ color: 'rgba(255,255,255,.6)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>
      </div>
    </aside>
  );
}
