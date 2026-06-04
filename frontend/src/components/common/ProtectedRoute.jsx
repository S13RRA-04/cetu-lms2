import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore, { ADMIN_ROLES } from '../../store/authStore.js';

export default function ProtectedRoute({ roles }) {
  const { user, accessToken } = useAuthStore();

  if (!accessToken) return <Navigate to="/login" replace />;

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

/* Convenience guard for admin-only sections — includes Program Managers */
export function AdminRoute() {
  const { user, accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  if (user && !ADMIN_ROLES.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
