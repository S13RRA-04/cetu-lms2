import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import useAuthStore from './store/authStore.js';
import LoginPage      from './pages/LoginPage.jsx';
import DashboardHome  from './pages/DashboardHome.jsx';
import AssignmentPage from './pages/AssignmentPage.jsx';
import GradesPage     from './pages/GradesPage.jsx';
import ScoreboardPage from './pages/ScoreboardPage.jsx';
import AdminPage      from './pages/AdminPage.jsx';
import ScenariosPage     from './pages/ScenariosPage.jsx';
import CourseContentPage from './pages/CourseContentPage.jsx';
import AppShell       from './layouts/AppShell.jsx';

function Guard({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminGuard({ children }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'instructor') return <Navigate to="/" replace />;
  return children;
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <Guard><AppShell /></Guard>,
    children: [
      { path: '/',                 element: <DashboardHome /> },
      { path: '/assignment/:id',   element: <AssignmentPage /> },
      { path: '/grades',           element: <GradesPage /> },
      { path: '/scoreboard',       element: <ScoreboardPage /> },
      { path: '/scenarios',        element: <ScenariosPage /> },
      { path: '/course-content',   element: <CourseContentPage /> },
      { path: '/admin',            element: <AdminGuard><AdminPage /></AdminGuard> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  const { setUser }   = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get('launch_token');
    if (!token) { setReady(true); return; }

    params.delete('launch_token');
    const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
    window.history.replaceState(null, '', clean);

    fetch('/api/v1/auth/exchange-launch-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then(({ accessToken, user }) => {
        localStorage.setItem('accessToken', accessToken);
        setUser(user);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <RouterProvider router={router} />;
}
