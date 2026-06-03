import { useEffect, useRef, useCallback, useState } from 'react';
import useAuthStore from '../store/authStore.js';
import { logout as apiLogout } from '../api/pact.js';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const WARN_BEFORE_MS  =  5 * 60 * 1000; // show warning 5 minutes before logout

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

export default function useSessionTimeout({ onTimeout }) {
  const { setUser } = useAuthStore();
  const lastActivity = useRef(Date.now());
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft,    setSecondsLeft]    = useState(Math.round(WARN_BEFORE_MS / 1000));
  const countdownRef = useRef(null);

  const doLogout = useCallback(async () => {
    clearInterval(countdownRef.current);
    try { await apiLogout(); } catch {}
    setUser(null);
    onTimeout?.();
  }, [setUser, onTimeout]);

  const resetActivity = useCallback(() => {
    lastActivity.current = Date.now();
    if (warningVisible) {
      setWarningVisible(false);
      setSecondsLeft(Math.round(WARN_BEFORE_MS / 1000));
      clearInterval(countdownRef.current);
    }
  }, [warningVisible]);

  // Activity listeners
  useEffect(() => {
    const handler = () => resetActivity();
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handler));
  }, [resetActivity]);

  // Idle checker — runs every second
  useEffect(() => {
    const tick = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      const remaining = IDLE_TIMEOUT_MS - idle;

      if (remaining <= 0) {
        clearInterval(tick);
        doLogout();
      } else if (remaining <= WARN_BEFORE_MS && !warningVisible) {
        setWarningVisible(true);
        setSecondsLeft(Math.round(remaining / 1000));
        countdownRef.current = setInterval(() => {
          setSecondsLeft((s) => {
            if (s <= 1) { clearInterval(countdownRef.current); doLogout(); return 0; }
            return s - 1;
          });
        }, 1000);
      }
    }, 1000);

    return () => { clearInterval(tick); clearInterval(countdownRef.current); };
  }, [warningVisible, doLogout]);

  return { warningVisible, secondsLeft, resetActivity, doLogout };
}
