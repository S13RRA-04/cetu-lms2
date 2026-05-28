import { useEffect, useState } from 'react';
import { getScoreboard } from '../api/lair.js';
import useAuthStore from '../store/authStore.js';

export default function ScoreboardPage() {
  const { user }      = useAuthStore();
  const [board,   setBoard]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScoreboard()
      .then(setBoard)
      .catch(() => setBoard([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  if (board.length === 0) {
    return (
      <div className="grades-page">
        <h1 className="page-title">Scoreboard</h1>
        <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)' }}>No scores posted yet.</p>
        </div>
      </div>
    );
  }

  const maxTotal = Math.max(...board.map((e) => e.maxScore), 1);

  return (
    <div className="grades-page">
      <h1 className="page-title">Scoreboard</h1>
      <div className="glass-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {board.map((entry, i) => {
            const isMe = entry.userId === user?.id;
            const pct  = Math.round((entry.totalScore / (entry.maxScore || 1)) * 100);
            const barColor = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#2563eb';
            return (
              <div key={entry.userId} className={`scoreboard-row${isMe ? ' scoreboard-me' : ''}`}>
                <span className="scoreboard-rank" style={{ color: i < 3 ? barColor : 'var(--muted)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <span className="scoreboard-name">
                  {entry.firstName} {entry.lastName}
                  {isMe && <span className="scoreboard-you"> (you)</span>}
                </span>
                <div className="scoreboard-bar-wrap">
                  <div className="scoreboard-bar-fill" style={{ width: `${(entry.totalScore / maxTotal) * 100}%`, background: barColor }} />
                </div>
                <span className="scoreboard-score" style={{ color: barColor }}>{entry.totalScore}</span>
                <span className="scoreboard-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
