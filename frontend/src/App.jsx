import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CoursesPage from './pages/courses/CoursesPage.jsx';
import CourseDetailPage from './pages/courses/CourseDetailPage.jsx';
import CourseFormPage from './pages/courses/CourseFormPage.jsx';
import UsersPage from './pages/users/UsersPage.jsx';
import LtiPage from './pages/admin/LtiPage.jsx';
import GradesPage from './pages/GradesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
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
            <Route element={<ProtectedRoute roles={['admin', 'superadmin']} />}>
              <Route path="users" element={<UsersPage />} />
              <Route path="admin/lti" element={<LtiPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
