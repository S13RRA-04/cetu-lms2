import { useEffect, useRef, useState, useCallback } from 'react';
import useAuthStore from '../store/authStore.js';

/*
  useSquadFieldSync — live view + take-control locking for shared
  (squad) challenge fields, layered on top of the existing REST
  persistence path (ChallengeFlow.jsx still saves via
  saveSquadChallengeState independently; this hook never touches
  storage, only live broadcast + lock arbitration).

  If the socket is unavailable/drops, callers should keep working off
  local state — ChallengeFlow's existing (poll-based) fallback covers
  that case, so nothing here is required for correctness, only for the
  live-typing/take-control experience.
*/

const PING_INTERVAL_MS = 4000;
const INPUT_THROTTLE_MS = 120;
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 10000;
const TAKEOVER_NOTICE_MS = 4000;

export default function useSquadFieldSync({ courseId, assignmentId, enabled }) {
  const user = useAuthStore((s) => s.user);
  const [fieldLocks, setFieldLocks] = useState({});
  const [liveValues, setLiveValues] = useState({});
  const [connected, setConnected] = useState(false);
  const [takeoverNotice, setTakeoverNotice] = useState(null); // { field, by } | null

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(RECONNECT_MIN_MS);
  const pingTimer = useRef(null);
  const noticeTimer = useRef(null);
  const inputThrottle = useRef({}); // field -> { timer, pendingValue }

  useEffect(() => {
    if (!enabled || !assignmentId || !courseId) return undefined;
    let cancelled = false;
    setFieldLocks({});
    setLiveValues({});

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/squad-challenge`);
      wsRef.current = ws;

      ws.onopen = () => {
        const token = localStorage.getItem('accessToken');
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        switch (msg.type) {
          case 'authed':
            reconnectDelay.current = RECONNECT_MIN_MS;
            ws.send(JSON.stringify({ type: 'join', courseId, assignmentId }));
            break;
          case 'joined':
            setConnected(true);
            setFieldLocks(msg.fieldLocks ?? {});
            break;
          case 'locks':
            setFieldLocks(msg.fieldLocks ?? {});
            break;
          case 'claimed':
            setFieldLocks((prev) => ({ ...prev, [msg.field]: msg.user }));
            if (msg.previousUser && msg.previousUser.user_id === user?.id && msg.user?.user_id !== user?.id) {
              clearTimeout(noticeTimer.current);
              setTakeoverNotice({ field: msg.field, by: msg.user });
              noticeTimer.current = setTimeout(() => setTakeoverNotice(null), TAKEOVER_NOTICE_MS);
            }
            break;
          case 'released':
            setFieldLocks((prev) => {
              if (!(msg.field in prev)) return prev;
              const next = { ...prev };
              delete next[msg.field];
              return next;
            });
            break;
          case 'input':
            setLiveValues((prev) => ({ ...prev, [msg.field]: msg.value }));
            break;
          default:
            break;
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (cancelled) return;
        reconnectTimer.current = setTimeout(connect, reconnectDelay.current);
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, RECONNECT_MAX_MS);
      };
      ws.onerror = () => { try { ws.close(); } catch { /* already closing */ } };

      clearInterval(pingTimer.current);
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, PING_INTERVAL_MS);
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer.current);
      clearInterval(pingTimer.current);
      clearTimeout(noticeTimer.current);
      for (const state of Object.values(inputThrottle.current)) clearTimeout(state.timer);
      inputThrottle.current = {};
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, assignmentId, courseId, user?.id]);

  const sendRaw = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  const claimField = useCallback((field) => sendRaw({ type: 'claim', field }), [sendRaw]);
  const releaseField = useCallback((field) => {
    const state = inputThrottle.current[field];
    if (state?.timer) {
      clearTimeout(state.timer);
      sendRaw({ type: 'input', field, value: state.pendingValue });
      delete inputThrottle.current[field];
    }
    sendRaw({ type: 'release', field });
  }, [sendRaw]);

  const sendInput = useCallback((field, value) => {
    const state = inputThrottle.current[field] ?? {};
    state.pendingValue = value;
    if (!state.timer) {
      state.timer = setTimeout(() => {
        sendRaw({ type: 'input', field, value: state.pendingValue });
        state.timer = null;
      }, INPUT_THROTTLE_MS);
    }
    inputThrottle.current[field] = state;
  }, [sendRaw]);

  return { fieldLocks, liveValues, connected, takeoverNotice, claimField, releaseField, sendInput };
}
