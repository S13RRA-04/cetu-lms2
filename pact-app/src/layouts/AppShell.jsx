import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, getMyEnrollment } from '../api/pact.js';
import AppLayout from './AppLayout.jsx';
import SessionTimeoutWarning from '../components/SessionTimeoutWarning.jsx';
import useSessionTimeout from '../hooks/useSessionTimeout.js';

export default function AppShell() {
  const [assignments, setAssignments] = useState([]);
  const [enrollment,  setEnrollment]  = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getAssignments(), getMyEnrollment().catch(() => null)])
      .then(([raw, enroll]) => {
        setAssignments(Array.isArray(raw) ? raw : (raw.data ?? []));
        setEnrollment(enroll);
      })
      .catch(() => {});
  }, []);

  const handleTimeout = useCallback(() => navigate('/logged-out', { replace: true }), [navigate]);

  const { warningVisible, secondsLeft, resetActivity, doLogout } = useSessionTimeout({
    onTimeout: handleTimeout,
  });

  const handleStayLoggedIn = () => resetActivity();
  const handleLogoutNow    = () => { doLogout(); navigate('/logged-out', { replace: true }); };

  return (
    <>
      <AppLayout assignments={assignments} enrollment={enrollment} />
      {warningVisible && (
        <SessionTimeoutWarning
          secondsLeft={secondsLeft}
          onStayLoggedIn={handleStayLoggedIn}
          onLogout={handleLogoutNow}
        />
      )}
    </>
  );
}
