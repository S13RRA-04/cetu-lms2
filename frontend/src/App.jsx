import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as authApi from './api/auth.js';
import useAuthStore from './store/authStore.js';
import ProtectedRoute, { AdminRoute } from './components/common/ProtectedRoute.jsx';
import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CoursesPage from './pages/courses/CoursesPage.jsx';
import CourseDetailPage from './pages/courses/CourseDetailPage.jsx';
import CourseFormPage from './pages/courses/CourseFormPage.jsx';
import UsersPage from './pages/users/UsersPage.jsx';
import LtiPage        from './pages/admin/LtiPage.jsx';
import AdminGradesPage    from './pages/admin/AdminGradesPage.jsx';
import AdminAnalyticsPage      from './pages/admin/AdminAnalyticsPage.jsx';
import AdminProgramOverviewPage  from './pages/admin/AdminProgramOverviewPage.jsx';
import AdminProgramManagersPage from './pages/admin/AdminProgramManagersPage.jsx';
import GradesPage from './pages/GradesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';

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

export default function App() {
  const { accessToken, setAuth } = useAuthStore();
  const [ready, setReady]        = useState(false);

  useEffect(() => {
    if (!isTokenStale(accessToken)) { setReady(true); return; }

    /* No (or stale) local access token — try to resume a session from the shared
       refresh_token cookie (set by PACT/LAIR/KCR on the same .cetu.online domain)
       before ProtectedRoute redirects to /login. */
    authApi.refresh()
      .then(({ accessToken: newToken, user }) => { if (user) setAuth(user, newToken); })
      .catch(() => { /* no valid cookie — fall through to normal login */ })
      .finally(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/new" element={<CourseFormPage />} />
            <Route path="courses/:id" element={<CourseDetailPage />} />
            <Route path="courses/:id/edit" element={<CourseFormPage />} />
            <Route path="grades" element={<GradesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route element={<AdminRoute />}>
              <Route path="users" element={<UsersPage />} />
              <Route path="admin/grades"           element={<AdminGradesPage />} />
              <Route path="admin/analytics"        element={<AdminAnalyticsPage />} />
              <Route path="admin/program"          element={<AdminProgramOverviewPage />} />
              <Route path="admin/program-managers" element={<AdminProgramManagersPage />} />
              <Route path="admin/lti"              element={<LtiPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
