import { useEffect, useRef, useState, useCallback } from 'react';

/*
  useCaseFileSession — live connection to the Case File coordinator over
  /ws/case-file. Two roles:
    - facilitator: creates a session (supplying opaque deck/inject card ID
      lists from the locally-bundled case content) and drives every game
      action.
    - player: joins an existing session via its room code and receives the
      same broadcast state, read-only.

  The server broadcasts one identical `state` object to every socket in a
  room (see caseFileCoordinator.js's publicState()) — the coordinator holds
  no private card text at all, so there is no separate "facilitator view"
  to request here. Privacy comes from the case-content file players never
  import, not from anything this hook filters.
*/

const PING_INTERVAL_MS = 15000;
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 10000;

export default function useCaseFileSession({ role, joinCode, session, enabled }) {
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState(null);
  const [state, setState] = useState(null);
  const [lastResult, setLastResult] = useState(null); // most recent action_result.result
  const [error, setError] = useState(null);
  const [ended, setEnded] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(RECONNECT_MIN_MS);
  const pingTimer = useRef(null);
  const requestId = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const joinCodeRef = useRef(joinCode);
  joinCodeRef.current = joinCode;

  useEffect(() => {
    if (!enabled || !role) return undefined;
    if (role === 'player' && !joinCode) return undefined;
    let cancelled = false;
    setEnded(false);
    setError(null);

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/case-file`);
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
            if (role === 'facilitator') {
              ws.send(JSON.stringify({ type: 'join', role: 'facilitator', ...sessionRef.current }));
            } else {
              ws.send(JSON.stringify({ type: 'join', role: 'player', code: joinCodeRef.current }));
            }
            break;
          case 'joined':
            setConnected(true);
            setCode(msg.code);
            setState(msg.state);
            setError(null);
            break;
          case 'state':
            setState(msg.state);
            break;
          case 'action_result':
            setLastResult({ action: msg.action, requestId: msg.requestId, result: msg.result });
            break;
          case 'error':
            setError(msg.message);
            break;
          case 'ended':
            setEnded(true);
            setConnected(false);
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
      wsRef.current?.close();
      wsRef.current = null;
    };
    // Only (re)connect when role/enabled/joinCode change — `session` (the
    // facilitator's deck payload) is read via sessionRef at join time so
    // that re-renders of the caller don't tear down the live connection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, role, joinCode]);

  const sendAction = useCallback((action, params = {}) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return null;
    const id = ++requestId.current;
    ws.send(JSON.stringify({ type: 'action', action, params, requestId: id }));
    return id;
  }, []);

  return { connected, code, state, lastResult, error, ended, sendAction };
}
