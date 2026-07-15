import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { getScoreboard, getSquadScoreboard, getMyEnrollment } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';
import DecryptText from '../components/DecryptText.jsx';

const RANK_COLORS = { 0: '#f59e0b', 1: '#94a3b8', 2: '#cd7c3a' };
const VISIBLE_COUNT = 5;

// Standings only ever show the top N plus the viewer's own entry — never the
// full ranked list, so no one sees exactly how far behind (or last) they are.
function visibleSlice(board, isMineFn) {
  const ranked   = board.map((entry, rank) => ({ entry, rank }));
  const top      = ranked.slice(0, VISIBLE_COUNT);
  const mine     = ranked.find(({ entry, rank }) => rank >= VISIBLE_COUNT && isMineFn(entry));
  return { top, mine };
}

function RankBadge({ rank }) {
  const color = RANK_COLORS[rank] ?? 'var(--muted)';
  if (rank < 3) {
    return (
      <span className="ops-rank-badge" style={{ color }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        {rank + 1}
      </span>
    );
  }
  return <span className="ops-rank-badge" style={{ color }}>#{rank + 1}</span>;
}

export default function ScoreboardPage() {
  const { user } = useAuthStore();
  const [tab,          setTab]          = useState('individual');
  const [individuals,  setIndividuals]  = useState([]);
  const [squads,       setSquads]       = useState([]);
  const [mySquadId,    setMySquadId]    = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      getScoreboard().catch(() => []),
      getSquadScoreboard().catch(() => []),
      getMyEnrollment().catch(() => null),
    ]).then(([ind, sq, enrollment]) => {
      setIndividuals(Array.isArray(ind) ? ind : []);
      setSquads(Array.isArray(sq) ? sq : []);
      setMySquadId(enrollment?.squad?.id ?? null);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.16em' }}>
        LOADING STANDINGS...
      </div>
    </div>
  );

  const board    = tab === 'individual' ? individuals : squads;
  const maxTotal = board.reduce((m, e) => Math.max(m, e.maxScore ?? 0), 1);
  const isEmpty  = board.length === 0;

  const isMine = tab === 'individual'
    ? (entry) => entry.userId === user?.id
    : (entry) => !!mySquadId && entry.squadId === mySquadId;
  const { top, mine } = visibleSlice(board, isMine);

  return (
    <div className="ops-dashboard">
      <div className="ops-dash-eyebrow"><DecryptText text="STANDINGS" speed={22} hold={3} /></div>
      <h1 className="ops-dash-name" style={{ marginBottom: 16 }}>Standings</h1>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['individual', 'squad'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '5px 14px', borderRadius: 4, fontSize: 11, fontFamily: 'var(--mono)',
              letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer',
              border: `1px solid ${tab === t ? 'var(--primary)' : 'var(--border)'}`,
              background: tab === t ? 'var(--primary-md)' : 'transparent',
              color: tab === t ? 'var(--primary)' : 'var(--muted)',
            }}
          >
            {t === 'individual' ? 'Operators' : 'Squads'}
          </button>
        ))}
      </div>

      {isEmpty ? (
        <div className="ops-empty-state">
          <div className="ops-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="14" width="4" height="7" rx="1"/>
              <rect x="10" y="9" width="4" height="12" rx="1"/>
              <rect x="16" y="11" width="4" height="10" rx="1"/>
            </svg>
          </div>
          <div className="ops-empty-label">NO SCORES ON RECORD</div>
          <div className="ops-empty-sub">Standings will appear once evaluations are submitted.</div>
        </div>
      ) : (
        <div className="ops-board">
          {top.map(({ entry, rank }, i) => {
            const isMe     = isMine(entry);
            const pct      = Math.round((entry.totalScore / (entry.maxScore || 1)) * 100);
            const barColor = RANK_COLORS[rank] ?? 'var(--primary)';
            const barWidth = `${(entry.totalScore / maxTotal) * 100}%`;
            const label    = tab === 'individual'
              ? `${entry.firstName} ${entry.lastName}`
              : `Squad ${entry.squadNumber}${entry.squadName ? ` · ${entry.squadName}` : ''}`;

            return (
              <motion.div
                key={tab === 'individual' ? entry.userId : entry.squadId}
                className={`ops-board-entry${isMe ? ' ops-board-me' : ''}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.24, delay: i * 0.06 }}
              >
                <RankBadge rank={rank} />
                <span className="ops-board-name">
                  {label}
                  {isMe && <span className="ops-board-you">YOU</span>}
                </span>
                <div className="ops-board-bar-wrap">
                  <motion.div
                    className="ops-board-bar-fill"
                    style={{ background: barColor }}
                    initial={{ width: '0%' }}
                    animate={{ width: barWidth }}
                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 + i * 0.06 }}
                  />
                </div>
                <span className="ops-board-score" style={{ color: barColor }}>{entry.totalScore}</span>
                <span className="ops-board-pct">
                  <span>{pct}%</span>
                  {tab === 'squad' && <small>{entry.graded}/{entry.available ?? entry.graded} graded</small>}
                </span>
              </motion.div>
            );
          })}

          {mine && (
            <>
              <div className="ops-board-divider">⋯</div>
              {(() => {
                const { entry, rank } = mine;
                const pct      = Math.round((entry.totalScore / (entry.maxScore || 1)) * 100);
                const barWidth = `${(entry.totalScore / maxTotal) * 100}%`;
                const label    = tab === 'individual'
                  ? `${entry.firstName} ${entry.lastName}`
                  : `Squad ${entry.squadNumber}${entry.squadName ? ` · ${entry.squadName}` : ''}`;

                return (
                  <motion.div
                    key={tab === 'individual' ? entry.userId : entry.squadId}
                    className="ops-board-entry ops-board-me"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    <RankBadge rank={rank} />
                    <span className="ops-board-name">
                      {label}
                      <span className="ops-board-you">YOU</span>
                    </span>
                    <div className="ops-board-bar-wrap">
                      <motion.div
                        className="ops-board-bar-fill"
                        style={{ background: 'var(--primary)' }}
                        initial={{ width: '0%' }}
                        animate={{ width: barWidth }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="ops-board-score" style={{ color: 'var(--primary)' }}>{entry.totalScore}</span>
                    <span className="ops-board-pct">
                      <span>{pct}%</span>
                      {tab === 'squad' && <small>{entry.graded}/{entry.available ?? entry.graded} graded</small>}
                    </span>
                  </motion.div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
