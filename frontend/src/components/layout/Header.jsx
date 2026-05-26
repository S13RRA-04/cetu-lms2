import { useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';

const TITLES = {
  '/dashboard':  'Dashboard',
  '/courses':    'Courses',
  '/grades':     'My Grades',
  '/profile':    'My Profile',
  '/users':      'Users',
  '/admin/lti':  'LTI Platforms',
};

function getTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/courses/') && pathname.endsWith('/edit')) return 'Edit Course';
  if (pathname === '/courses/new') return 'New Course';
  if (pathname.startsWith('/courses/')) return 'Course Detail';
  return 'CETU LMS';
}

export default function Header() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const initials = user ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() : '?';

  return (
    <header className="header">
      <span className="header-title">{getTitle(pathname)}</span>
      <div className="header-user">
        <span className="text-sm text-muted">{user?.first_name} {user?.last_name}</span>
        <div className="avatar">{initials}</div>
      </div>
    </header>
  );
}
