import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAssignments, getMyEnrollment, getCampaignDrops } from '../api/pact.js';
import AppLayout          from './AppLayout.jsx';
import InductionSequence  from '../pages/InductionSequence.jsx';
import TransmissionInterceptor, { getSeenDropIds, markDropSeen, dropSeenId } from '../pages/TransmissionInterceptor.jsx';
import TargetRevealInterceptor, { targetSeenKey } from '../pages/TargetRevealInterceptor.jsx';
import VaultKeypad        from '../pages/VaultKeypad.jsx';
import SignalEntry        from '../pages/SignalEntry.jsx';
import SessionTimeoutWarning from '../components/SessionTimeoutWarning.jsx';
import DropAlert          from '../components/DropAlert.jsx';
import useSessionTimeout  from '../hooks/useSessionTimeout.js';
import useAuthStore       from '../store/authStore.js';

function inductionKey(userId) {
  return `pact_inducted_v1_${userId}`;
}

function vaultKey(userId, dropId) {
  return `pact_vault_v1_${userId}_${dropId}`;
}
function isVaultUnlocked(userId, dropId) {
  return !!localStorage.getItem(vaultKey(userId, dropId));
}
function markVaultUnlocked(userId, dropId) {
  localStorage.setItem(vaultKey(userId, dropId), '1');
}

function signalKey(userId, dropId) {
  return `pact_signal_v1_${userId}_${dropId}`;
}
function isSignalVerified(userId, dropId) {
  return !!localStorage.getItem(signalKey(userId, dropId));
}
function markSignalVerified(userId, dropId) {
  localStorage.setItem(signalKey(userId, dropId), '1');
}

function findNewDrop(drops, userId) {
  const seen = getSeenDropIds(userId);
  // Find lowest-numbered unlocked drop not yet seen (deliver one at a time).
  // Uses dropSeenId (id + updatedAt) so that updating a drop re-shows it.
  return drops
    .filter((d) => d.is_unlocked && !seen.includes(dropSeenId(d)))
    .sort((a, b) => a.number - b.number)[0] ?? null;
}

export default function AppShell() {
  const { user }  = useAuthStore();
  const [assignments,   setAssignments]   = useState([]);
  const [enrollment,    setEnrollment]    = useState(null);
  const [pendingDrop,   setPendingDrop]   = useState(null);
  const [alertDrop,     setAlertDrop]     = useState(null); // in-app polling alert
  const [loading,       setLoading]       = useState(true);
  const enrollmentRef = useRef(null); // keep latest enrollment for polling

  // Instructors and admins skip induction and transmissions entirely
  const isStudent = user?.role === 'student';
  const [vaultUnlocked,  setVaultUnlocked]  = useState(false);
  const [signalVerified, setSignalVerified] = useState(false);
  const [inducted, setInducted] = useState(() => {
    if (!isStudent || !user?.id) return true;
    return !!localStorage.getItem(inductionKey(user.id));
  });
  const [targetSeen, setTargetSeen] = useState(() => {
    if (!isStudent || !user?.id) return true;
    return !!localStorage.getItem(targetSeenKey(user.id));
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
        enrollmentRef.current = enroll;

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

  // Poll for new drops every 45 seconds while the user is in the app
  useEffect(() => {
    if (!isStudent || !user?.id) return;
    const poll = () => {
      const enroll = enrollmentRef.current;
      const cohortId = enroll?.cohort?.id;
      if (!cohortId || !localStorage.getItem(inductionKey(user.id))) return;
      getCampaignDrops(cohortId)
        .then((drops) => {
          const arr = Array.isArray(drops) ? drops : [];
          const newDrop = findNewDrop(arr, user.id);
          // Only show the floating alert if we're not already intercepting a drop
          if (newDrop) setAlertDrop((prev) => prev ?? newDrop);
        })
        .catch(() => {});
    };
    const id = setInterval(poll, 45000);
    return () => clearInterval(id);
  }, [isStudent, user?.id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleInductionComplete = useCallback(() => {
    if (user?.id) localStorage.setItem(inductionKey(user.id), '1');
    setInducted(true);
  }, [user?.id]);

  const handleTransmissionAck = useCallback(() => {
    if (user?.id && pendingDrop) markDropSeen(user.id, pendingDrop);
    setPendingDrop(null);
    setVaultUnlocked(false);
    setSignalVerified(false);
  }, [user?.id, pendingDrop]);

  const handleVaultUnlock = useCallback(() => {
    if (user?.id && pendingDrop) markVaultUnlocked(user.id, pendingDrop.id);
    setVaultUnlocked(true);
  }, [user?.id, pendingDrop]);

  const handleSignalVerify = useCallback(() => {
    if (user?.id && pendingDrop) markSignalVerified(user.id, pendingDrop.id);
    setSignalVerified(true);
  }, [user?.id, pendingDrop]);

  const handleAlertView = useCallback(() => {
    if (alertDrop) {
      setPendingDrop(alertDrop);
      setAlertDrop(null);
    }
  }, [alertDrop]);

  const handleAlertDismiss = useCallback(() => {
    if (user?.id && alertDrop) markDropSeen(user.id, alertDrop);
    setAlertDrop(null);
  }, [user?.id, alertDrop]);

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

  // Target reveal — admin has revealed the target and student hasn't acknowledged it yet
  const targetRevealed = enrollment?.cohort?.target_revealed;
  if (isStudent && inducted && targetRevealed && !targetSeen && enrollment?.squad) {
    return (
      <TargetRevealInterceptor
        enrollment={enrollment}
        onAcknowledge={() => {
          if (user?.id) localStorage.setItem(targetSeenKey(user.id), '1');
          setTargetSeen(true);
        }}
      />
    );
  }

  // Incoming transmission — student, inducted, new drop pending
  // Gate order: Signal → Vault → Transmission
  if (isStudent && pendingDrop) {
    const needsSignal = pendingDrop.html_signal &&
      !signalVerified &&
      !isSignalVerified(user?.id, pendingDrop.id);
    if (needsSignal) {
      return <SignalEntry drop={pendingDrop} onVerify={handleSignalVerify} />;
    }

    const needsVault = pendingDrop.vault_hint &&
      !vaultUnlocked &&
      !isVaultUnlocked(user?.id, pendingDrop.id);
    if (needsVault) {
      return <VaultKeypad drop={pendingDrop} onUnlock={handleVaultUnlock} />;
    }

    return <TransmissionInterceptor drop={pendingDrop} onAcknowledge={handleTransmissionAck} />;
  }

  return (
    <>
      <AppLayout assignments={assignments} enrollment={enrollment} />
      {/* Floating in-app drop alert — shown while user is active in the app */}
      {isStudent && !pendingDrop && alertDrop && (
        <DropAlert
          drop={alertDrop}
          onView={handleAlertView}
          onDismiss={handleAlertDismiss}
        />
      )}
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
