import { useEffect, useRef, useState } from 'react';

/*
  useGrandJuryWheelListener — listens on the squad's grand-jury-wheel
  channel for a live "winner" announcement pushed when an instructor
  spins the wheel (see AdminPage's GrandJuryWheelPanel). Purely a
  notification feed; nothing here persists state.
*/

const PING_INTERVAL_MS = 20000;
const RECONNECT_MIN_MS = 1000;
const RECONNECT_MAX_MS = 15000;

export default function useGrandJuryWheelListener({ squadId, enabled }) {
  const [winner, setWinner] = useState(null); // { userId, name } | null

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(RECONNECT_MIN_MS);
  const pingTimer = useRef(null);

  useEffect(() => {
    if (!enabled || !squadId) return undefined;
    let cancelled = false;

    const connect = () => {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/grand-jury-wheel`);
      wsRef.current = ws;

      ws.onopen = () => {
        const token = localStorage.getItem('accessToken');
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.type === 'authed') {
          reconnectDelay.current = RECONNECT_MIN_MS;
          ws.send(JSON.stringify({ type: 'join', squadId }));
        } else if (msg.type === 'winner') {
          setWinner({ userId: msg.userId, name: msg.name });
        }
      };

      ws.onclose = () => {
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
  }, [enabled, squadId]);

  const clearWinner = () => setWinner(null);

  return { winner, clearWinner };
}
