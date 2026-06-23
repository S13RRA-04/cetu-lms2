import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { getMyEnrollment, getAssignments, getCampaignDrops } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';
import DecryptText from '../components/DecryptText.jsx';

const PROF_ROLE_LABELS = {
  special_agent:                    'Special Agent',
  intelligence_analyst:             'Intelligence Analyst',
  operational_support_sos:          'Operational Support (SOS/TS)',
  operational_support_da:           'Operational Support (Data Analyst)',
  supervisory_special_agent:        'Supervisory Special Agent',
  supervisory_intelligence_analyst: 'Supervisory Intelligence Analyst',
  task_force_officer:               'Task Force Officer',
};

const TYPE_COLOR = {
  module:     '#60a5fa',
  game:       '#34d399',
  assessment: '#fbbf24',
  survey:     '#a78bfa',
  challenge:  '#f87171',
  capstone:   '#fb923c',
};

function useCountUp(target, duration = 800) {
  const [val, setVal]   = useState(0);
  const started         = useRef(false);
  useEffect(() => {
    if (target === 0 || started.current) return;
    started.current = true;
    const t0   = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duration, 1);
      setVal(Math.round(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

export default function DashboardHome() {
  const { user }      = useAuthStore();
  const navigate      = useNavigate();
  const [enrollment,     setEnrollment]     = useState(null);
  const [assignments,    setAssignments]    = useState([]);
  const [drops,          setDrops]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeSection,  setActiveSection]  = useState(null);

  useEffect(() => {
    getMyEnrollment().catch(() => null).then((enroll) => {
      setEnrollment(enroll);
      const cohortId = enroll?.cohort?.id;
      return Promise.all([
        getAssignments().catch(() => []),
        cohortId ? getCampaignDrops(cohortId).catch(() => []) : Promise.resolve([]),
      ]);
    }).then(([raw, dropData]) => {
      setAssignments(Array.isArray(raw) ? raw : (raw?.data ?? []));
      setDrops(Array.isArray(dropData) ? dropData : []);
    }).finally(() => setLoading(false));
  }, []);

  const role        = user?.professional_role ? PROF_ROLE_LABELS[user.professional_role] ?? user.professional_role : null;
  const unlocked    = assignments.filter((a) => a.is_unlocked !== false).length;
  const completed   = assignments.filter((a) => (a.progress ?? 0) >= 100).length;
  const inProgress  = assignments.filter((a) => (a.progress ?? 0) > 0 && (a.progress ?? 0) < 100).length;
  const total       = assignments.length;
  const overallPct  = total > 0
    ? Math.round(assignments.reduce((s, a) => s + (a.progress ?? 0), 0) / total) : 0;

  const activeDrop  = [...drops].filter((d) => d.is_unlocked).sort((a, b) => b.number - a.number)[0] ?? null;

  const cUnlocked   = useCountUp(unlocked);
  const cCompleted  = useCountUp(completed);
  const cProgress   = useCountUp(inProgress);
  const cPct        = useCountUp(overallPct);

  /* Group all assignments by section for the tasking feed */
  const TYPE_SECTIONS = [
    { label: 'MODULES',     types: ['module'],                key: 'modules'     },
    { label: 'CHALLENGES',  types: ['challenge'],              key: 'challenges'  },
    { label: 'ASSESSMENTS', types: ['assessment', 'survey'],  key: 'assessments' },
    { label: 'CAPSTONES',   types: ['capstone'],               key: 'capstones'   },
    { label: 'GAMES',       types: ['game'],                   key: 'games'       },
  ];
  const taskingSections = TYPE_SECTIONS.map((s) => ({
    ...s,
    items: assignments.filter((a) => s.types.includes(a.type)),
  })).filter((s) => s.items.length > 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: '.16em' }}>
          LOADING OPERATIONS CENTER...
        </div>
      </div>
    );
  }

  return (
    <div className="ops-dashboard">

      {/* ── Page header ── */}
      <div className="ops-dash-header">
        <div className="ops-dash-eyebrow"><DecryptText text="OPERATIONS CENTER" speed={22} hold={3} /></div>
        <h1 className="ops-dash-name">
          {user?.first_name} {user?.last_name}
        </h1>
        <div className="ops-dash-meta">
          {role && <span style={{ color: 'var(--primary)' }}>{role}</span>}
          {role && enrollment?.cohort?.name && <span className="ops-dash-sep">·</span>}
          <span>{enrollment?.cohort?.name ?? 'Task Force Operations'}</span>
          {enrollment?.squad && (
            <>
              <span className="ops-dash-sep">·</span>
              <span>Squad {enrollment.squad.number}{enrollment.squad.name ? ` — ${enrollment.squad.name}` : ''}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Command Post bulletin ── */}
      {activeDrop?.narrative_intro && (
        <div className="ops-cp-bulletin">
          <div className="ops-cp-header">
            <span className="ops-cp-led" />
            <DecryptText
              text={`COMMAND POST — DROP ${activeDrop.number}: ${activeDrop.title}`}
              speed={18}
              hold={4}
            />
          </div>
          <p className="ops-cp-body">{activeDrop.narrative_intro}</p>
        </div>
      )}

      {/* ── Stat strip ── */}
      <div className="ops-stat-strip">
        {[
          { val: cUnlocked,  label: 'ISSUED',      cls: '' },
          { val: cCompleted, label: 'CLOSED',       cls: ' ops-stat-green' },
          { val: cProgress,  label: 'ACTIVE',       cls: ' ops-stat-amber' },
          { val: cPct,       label: 'CASE STATUS',  cls: ' ops-stat-primary', pct: true },
        ].map(({ val, label, cls, pct }, i) => (
          <motion.div
            key={label}
            className={`ops-stat${cls}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: i * 0.07 }}
          >
            <div className="ops-stat-value">
              {val}{pct && <span style={{ fontSize: '0.55em', fontWeight: 400 }}>%</span>}
            </div>
            <div className="ops-stat-label">{label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Case progress bar ── */}
      <div className="ops-progress-block">
        <div className="ops-progress-header">
          <span className="ops-section-label">CASE PROGRESS</span>
          <span className="ops-progress-fraction">{completed} / {total} taskings</span>
        </div>
        <div className="ops-progress-track">
          <motion.div
            className="ops-progress-fill"
            initial={{ width: '0%' }}
            animate={{ width: `${overallPct}%` }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
        {drops.length > 0 && (
          <div className="ops-drop-markers">
            {drops.map((d) => (
              <span key={d.id} className={`ops-drop-marker${d.is_unlocked ? ' active' : ''}`}>
                DROP {d.number}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Tasking feed — tabbed by type ── */}
      {taskingSections.length > 0 && (() => {
        const currentKey  = activeSection ?? taskingSections[0].key;
        const currentSec  = taskingSections.find((s) => s.key === currentKey) ?? taskingSections[0];
        return (
          <div className="ops-tasking-block">
            <div className="ops-section-label" style={{ marginBottom: 10 }}>ACTIVE TASKING</div>

            {/* Tab bar */}
            <div className="ops-type-tabs">
              {taskingSections.map((s) => {
                const unlocked = s.items.filter((a) => a.is_unlocked !== false).length;
                return (
                  <button
                    key={s.key}
                    className={`ops-type-tab${currentKey === s.key ? ' ops-type-tab-active' : ''}`}
                    onClick={() => setActiveSection(s.key)}
                  >
                    {s.label}
                    <span className="ops-type-tab-count">{unlocked}/{s.items.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Active section rows */}
            <div className="ops-tasking-group" style={{ marginTop: 0 }}>
              {currentSec.items.map((a, i) => (
                <TaskingRow
                  key={a.id}
                  assignment={a}
                  idx={i}
                  onOpen={a.is_unlocked !== false ? () => navigate(`/assignment/${a.id}`) : null}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {assignments.length === 0 && (
        <div className="ops-empty-state">
          <div className="ops-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="ops-empty-label">NO TASKINGS ISSUED</div>
          <div className="ops-empty-sub">Stand by for command authorization.</div>
        </div>
      )}
    </div>
  );
}

function TaskingRow({ assignment: a, idx = 0, onOpen }) {
  const locked = !onOpen;
  const pct    = a.progress ?? 0;
  const done   = pct >= 100;
  const color  = locked ? 'var(--muted)' : (TYPE_COLOR[a.type] ?? '#60a5fa');

  return (
    <motion.button
      className={`ops-tasking-row${done ? ' ops-tasking-done' : ''}${locked ? ' ops-tasking-locked' : ''}`}
      onClick={locked ? undefined : onOpen}
      disabled={locked}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: 0.15 + idx * 0.055 }}
    >
      <span className="ops-tasking-type-dot" style={{ background: color }} />
      <span className="ops-tasking-title">{a.title}</span>
      {a.drop_number != null && (
        <span className="ops-tasking-drop">DROP {a.drop_number}</span>
      )}
      <div className="ops-tasking-right">
        {locked ? (
          <span className="ops-tasking-locked-label">🔒 LOCKED</span>
        ) : done ? (
          <span className="ops-tasking-done-label">CLOSED</span>
        ) : pct > 0 ? (
          <div className="ops-tasking-prog-wrap">
            <div className="ops-tasking-prog-track">
              <div className="ops-tasking-prog-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="ops-tasking-pct">{pct}%</span>
          </div>
        ) : (
          <span className="ops-tasking-open-label">OPEN</span>
        )}
      </div>
      {!locked && (
        <svg className="ops-tasking-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </motion.button>
  );
}
