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

function StandingsEntry({ entry, rank, tab, isMe, leaderScore, delay = 0 }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const rankingScore = tab === 'most_improved'
    ? Number(entry.assessmentImprovementPoints ?? 0)
    : Number(entry.totalScore ?? 0);
  const normalizedScore = leaderScore > 0
    ? Math.round((rankingScore / leaderScore) * 100)
    : 0;
  const barColor = RANK_COLORS[rank] ?? 'var(--primary)';
  const label = tab === 'squad'
    ? `Squad ${entry.squadNumber}${entry.squadName ? ` · ${entry.squadName}` : ''}`
    : `${entry.firstName} ${entry.lastName}`;

  return (
    <motion.div
      className={`ops-board-card${isMe ? ' ops-board-me' : ''}`}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, delay }}
    >
      <div className="ops-board-entry">
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
            animate={{ width: `${normalizedScore}%` }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 + delay }}
          />
        </div>
        <span className="ops-board-normalized" style={{ color: barColor }}>{normalizedScore}%</span>
        <button
          type="button"
          className="ops-board-breakdown-toggle"
          onClick={() => setShowBreakdown((open) => !open)}
          aria-expanded={showBreakdown}
        >
          Breakdown <span aria-hidden="true">▾</span>
        </button>
      </div>
      {showBreakdown && (
        <div className="ops-board-breakdown">
          {tab === 'most_improved' ? (
            <div>
              <span>Normalized improvement</span>
              <strong>+{entry.assessmentImprovementPoints ?? 0} percentage points</strong>
            </div>
          ) : (
            <>
              <div>
                <span>{tab === 'individual' ? 'Assignment points' : 'Squad evaluations'}</span>
                <strong>{entry.assignmentPoints ?? entry.totalScore ?? 0} pts</strong>
              </div>
              {tab === 'individual' && <div>
                <span>Pre-test</span>
                <strong>{entry.pretestPoints ?? 0} pts</strong>
              </div>}
              {tab === 'individual' && <div>
                <span>Post-test</span>
                <strong>{entry.posttestPoints ?? 0} pts</strong>
              </div>}
              {tab === 'individual' && <div>
                <span>Puzzle bonus</span>
                <strong>{entry.puzzlePoints ?? 0} pts</strong>
              </div>}
              <div>
                <span>Raw ranking total</span>
                <strong>{entry.totalScore ?? 0} pts</strong>
              </div>
            </>
          )}
          {tab !== 'most_improved' && <div>
            <span>Evaluated items</span>
            <strong>{entry.graded ?? 0}</strong>
          </div>}
          <p>
            Displayed standing: {normalizedScore}% of the current leader’s {leaderScore}
            {tab === 'most_improved' ? ' percentage-point improvement.' : ' raw points.'}
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function ScoreboardPage() {
  const { user } = useAuthStore();
  const [tab,          setTab]          = useState('individual');
  const [individuals,  setIndividuals]  = useState([]);
  const [squads,       setSquads]       = useState([]);
  const [mySquadId,    setMySquadId]    = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    let active = true;
    const load = () => Promise.all([
      getScoreboard().catch(() => []),
      getSquadScoreboard().catch(() => []),
      getMyEnrollment().catch(() => null),
    ]).then(([ind, sq, enrollment]) => {
      if (!active) return;
      setIndividuals(Array.isArray(ind) ? ind : []);
      setSquads(Array.isArray(sq) ? sq : []);
      setMySquadId(enrollment?.squad?.id ?? null);
    }).finally(() => {
      if (active) setLoading(false);
    });

    load();
    const interval = setInterval(load, 15_000);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', load);
    };
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.16em' }}>
        LOADING STANDINGS...
      </div>
    </div>
  );

  const mostImproved = individuals
    .filter((entry) =>
      entry.hasAssessmentComparison && Number(entry.assessmentImprovementPoints ?? 0) > 0
    )
    .sort((a, b) =>
      Number(b.assessmentImprovementPoints ?? 0) - Number(a.assessmentImprovementPoints ?? 0)
      || `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    );
  const board = tab === 'squad' ? squads : tab === 'most_improved' ? mostImproved : individuals;
  const leaderScore = board.reduce(
    (highest, entry) => Math.max(
      highest,
      Number(tab === 'most_improved' ? entry.assessmentImprovementPoints : entry.totalScore) || 0,
    ),
    0,
  );
  const isEmpty  = board.length === 0;

  const isMine = tab === 'squad'
    ? (entry) => !!mySquadId && entry.squadId === mySquadId
    : (entry) => entry.userId === user?.id;
  const { top, mine } = visibleSlice(board, isMine);

  return (
    <div className="ops-dashboard">
      <div className="ops-dash-eyebrow"><DecryptText text="STANDINGS" speed={22} hold={3} /></div>
      <h1 className="ops-dash-name" style={{ marginBottom: 16 }}>Standings</h1>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['individual', 'squad', 'most_improved'].map((t) => (
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
            {t === 'individual' ? 'Operators' : t === 'squad' ? 'Squads' : 'Most Improved'}
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
          <div className="ops-empty-label">
            {tab === 'most_improved' ? 'NO POSITIVE IMPROVEMENT YET' : 'NO SCORES ON RECORD'}
          </div>
          <div className="ops-empty-sub">
            {tab === 'most_improved'
              ? 'Standings will appear after learners complete both assessments with a positive normalized gain.'
              : 'Standings will appear once evaluations are submitted.'}
          </div>
        </div>
      ) : (
        <div className="ops-board">
          {top.map(({ entry, rank }, i) => (
            <StandingsEntry
              key={tab === 'squad' ? entry.squadId : entry.userId}
              entry={entry}
              rank={rank}
              tab={tab}
              isMe={isMine(entry)}
              leaderScore={leaderScore}
              delay={i * 0.06}
            />
          ))}

          {mine && (
            <>
              <div className="ops-board-divider">⋯</div>
              <StandingsEntry
                key={tab === 'squad' ? mine.entry.squadId : mine.entry.userId}
                entry={mine.entry}
                rank={mine.rank}
                tab={tab}
                isMe
                leaderScore={leaderScore}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
