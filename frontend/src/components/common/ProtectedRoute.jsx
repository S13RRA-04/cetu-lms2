import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore.js';

export default function ProtectedRoute({ roles }) {
  const { user, accessToken } = useAuthStore();

  if (!accessToken) return <Navigate to="/login" replace />;

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
