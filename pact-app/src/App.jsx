import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore.js';
import LoginPage      from './pages/LoginPage.jsx';
import DashboardPage  from './pages/DashboardPage.jsx';
import AssignmentPage from './pages/AssignmentPage.jsx';

function Guard({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  { path: '/login',             element: <LoginPage /> },
  { path: '/',                  element: <Guard><DashboardPage /></Guard> },
  { path: '/assignment/:id',    element: <Guard><AssignmentPage /></Guard> },
  { path: '*',                  element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
