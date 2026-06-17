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
import LoggedOutPage  from './pages/LoggedOutPage.jsx';

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
  { path: '/login',      element: <LoginPage /> },
  { path: '/logged-out', element: <LoggedOutPage /> },
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

/* Decode a JWT payload without verifying the signature (client-side expiry check only) */
function jwtExp(token) {
  try { return JSON.parse(atob(token.split('.')[1]))?.exp ?? 0; }
  catch { return 0; }
}

function isTokenStale(token) {
  if (!token) return true;
  // Treat as stale if it expires within the next 60 seconds
  return jwtExp(token) - 60 < Date.now() / 1000;
}

async function silentRefresh(setUser) {
  try {
    const res  = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) throw new Error('refresh failed');
    const { accessToken, user } = await res.json();
    localStorage.setItem('accessToken', accessToken);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    }
  } catch {
    /* Refresh cookie is gone — clear stale state so Guard redirects to /login */
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  }
}

export default function App() {
  const { setUser }       = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const launchToken = params.get('launch_token');

    if (launchToken) {
      /* Strip the param from the URL immediately so it's not bookmarked / logged */
      params.delete('launch_token');
      const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState(null, '', clean);

      fetch('/api/v1/auth/exchange-launch-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token: launchToken }),
      })
        .then((r) => r.ok ? r.json() : Promise.reject(r))
        .then(({ accessToken, user }) => {
          localStorage.setItem('accessToken', accessToken);
          setUser(user);
        })
        .catch(() => { /* token expired or invalid — fall through to normal login */ })
        .finally(() => setReady(true));
      return;
    }

    /* If the stored access token is missing or about to expire, refresh it now
       before any protected routes mount and fire API calls. This prevents the
       401-cascade that shows up in the console on every page reload. */
    const stored = localStorage.getItem('user');
    const access = localStorage.getItem('accessToken');
    if (stored && isTokenStale(access)) {
      silentRefresh(setUser).finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;
  return <RouterProvider router={router} />;
}
