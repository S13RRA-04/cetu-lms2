import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, getMyEnrollment, getCampaignDrops } from '../api/pact.js';
import AppLayout          from './AppLayout.jsx';
import InductionSequence  from '../pages/InductionSequence.jsx';
import TransmissionInterceptor, { getSeenDropIds, markDropSeen } from '../pages/TransmissionInterceptor.jsx';
import SessionTimeoutWarning from '../components/SessionTimeoutWarning.jsx';
import useSessionTimeout  from '../hooks/useSessionTimeout.js';
import useAuthStore       from '../store/authStore.js';

function inductionKey(userId) {
  return `pact_inducted_v1_${userId}`;
}

function findNewDrop(drops, userId) {
  const seen = getSeenDropIds(userId);
  // Find lowest-numbered unlocked drop not yet seen (deliver one at a time)
  return drops
    .filter((d) => d.is_unlocked && !seen.includes(d.id))
    .sort((a, b) => a.number - b.number)[0] ?? null;
}

export default function AppShell() {
  const { user }  = useAuthStore();
  const [assignments,   setAssignments]   = useState([]);
  const [enrollment,    setEnrollment]    = useState(null);
  const [pendingDrop,   setPendingDrop]   = useState(null);
  const [loading,       setLoading]       = useState(true);

  // Instructors and admins skip induction and transmissions entirely
  const isStudent = user?.role === 'student';
  const [inducted, setInducted] = useState(() => {
    if (!isStudent || !user?.id) return true;
    return !!localStorage.getItem(inductionKey(user.id));
  });

  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getAssignments(),
      getMyEnrollment().catch(() => null),
    ])
      .then(([raw, enroll]) => {
        setAssignments(Array.isArray(raw) ? raw : (raw?.data ?? []));
        setEnrollment(enroll);

        // Check for unseen drops only after induction is done
        if (isStudent && user?.id && !!localStorage.getItem(inductionKey(user.id))) {
          const cohortId = enroll?.cohort?.id;
          if (cohortId) {
            getCampaignDrops(cohortId)
              .then((drops) => {
                const arr = Array.isArray(drops) ? drops : [];
                const newDrop = findNewDrop(arr, user.id);
                if (newDrop) setPendingDrop(newDrop);
              })
              .catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleInductionComplete = useCallback(() => {
    if (user?.id) localStorage.setItem(inductionKey(user.id), '1');
    setInducted(true);
  }, [user?.id]);

  const handleTransmissionAck = useCallback(() => {
    if (user?.id && pendingDrop) markDropSeen(user.id, pendingDrop.id);
    setPendingDrop(null);
  }, [user?.id, pendingDrop]);

  const handleTimeout = useCallback(
    () => navigate('/logged-out', { replace: true }),
    [navigate],
  );

  const { warningVisible, secondsLeft, resetActivity, doLogout } = useSessionTimeout({
    onTimeout: handleTimeout,
  });

  const handleStayLoggedIn = () => resetActivity();
  const handleLogoutNow    = () => { doLogout(); navigate('/logged-out', { replace: true }); };

  // Show induction for students who haven't seen it yet (wait for enrollment to load)
  if (isStudent && !inducted) {
    if (loading) {
      return (
        <div style={{
          minHeight: '100vh', background: '#070a0d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'monospace', color: 'rgba(148,163,184,0.4)', letterSpacing: '.15em', fontSize: 12 }}>
            LOADING OPERATIONS CENTER...
          </div>
        </div>
      );
    }
    return (
      <InductionSequence
        user={user}
        enrollment={enrollment}
        onComplete={handleInductionComplete}
      />
    );
  }

  // Incoming transmission — student, inducted, new drop pending
  if (isStudent && pendingDrop) {
    return <TransmissionInterceptor drop={pendingDrop} onAcknowledge={handleTransmissionAck} />;
  }

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
