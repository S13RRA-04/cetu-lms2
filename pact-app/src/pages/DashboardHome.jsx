import { useEffect, useState } from 'react';
import { getMyEnrollment, getAssignments, getCampaignDrops } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';
import { getVictim } from '../constants/victims.js';

const PROF_ROLE_LABELS = {
  special_agent:                    'Special Agent',
  intelligence_analyst:             'Intelligence Analyst',
  operational_support_sos:          'Operational Support (SOS/TS)',
  operational_support_da:           'Operational Support (Data Analyst)',
  supervisory_special_agent:        'Supervisory Special Agent',
  supervisory_intelligence_analyst: 'Supervisory Intelligence Analyst',
  task_force_officer:               'Task Force Officer',
};


export default function DashboardHome() {
  const { user }      = useAuthStore();
  const [enrollment,  setEnrollment]  = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [drops,       setDrops]       = useState([]);
  const [loading,     setLoading]     = useState(true);

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

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const squad  = enrollment?.squad;
  const victim = squad ? getVictim(squad.number) : null;
  const role   = user?.professional_role ? PROF_ROLE_LABELS[user.professional_role] ?? user.professional_role : null;

  const unlockedDrops  = drops.filter((d) => d.is_unlocked);
  const activeDrop     = unlockedDrops.length > 0 ? unlockedDrops[unlockedDrops.length - 1] : null;
  const nextDrop       = drops.find((d) => !d.is_unlocked);

  const unlocked   = assignments.filter((a) => a.is_unlocked !== false).length;
  const completed  = assignments.filter((a) => (a.progress ?? 0) >= 100).length;
  const inProgress = assignments.filter((a) => (a.progress ?? 0) > 0 && (a.progress ?? 0) < 100).length;
  const total      = assignments.length;
  const overallPct = total > 0
    ? Math.round(assignments.reduce((s, a) => s + (a.progress ?? 0), 0) / total)
    : 0;

  return (
    <div className="dash-home">

      {/* ── Operation header ── */}
      <div className="dash-welcome">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            OPERATION BRKR
          </span>
          {activeDrop && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em',
              padding: '2px 8px', borderRadius: 4, border: '1px solid var(--primary)',
              color: 'var(--primary)', textTransform: 'uppercase',
            }}>
              DROP {activeDrop.number} ACTIVE
            </span>
          )}
        </div>
        <h1 className="dash-welcome-name">
          {user?.first_name} {user?.last_name}
        </h1>
        <p className="dash-welcome-sub">
          {role && <span style={{ color: 'var(--primary)' }}>{role}</span>}
          {role && enrollment?.cohort?.name && <span className="dash-welcome-sep">·</span>}
          {enrollment?.cohort?.name ?? 'Task Force Operations'}
          {squad && <><span className="dash-welcome-sep">·</span>Squad {squad.number}{squad.name ? ` — ${squad.name}` : ''}</>}
        </p>
      </div>

      {/* ── Active investigation target ── */}
      {victim && (
        <div className="glass-card" style={{
          borderLeft: `3px solid ${victim.color}`,
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: victim.color, marginBottom: 4, textTransform: 'uppercase' }}>
                YOUR INVESTIGATION TARGET
              </div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{victim.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{victim.sector} · Code: {victim.code}</div>
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10, padding: '4px 10px',
              borderRadius: 4, background: `${victim.color}20`, color: victim.color,
              border: `1px solid ${victim.color}40`, letterSpacing: '.08em',
            }}>
              SQUAD {squad.number}
            </div>
          </div>
        </div>
      )}

      {/* ── Command Post bulletin (active drop) ── */}
      {activeDrop?.narrative_intro && (
        <div className="glass-card" style={{ borderLeft: '3px solid var(--primary)', padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em', color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase' }}>
            COMMAND POST — DROP {activeDrop.number}: {activeDrop.title}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>
            {activeDrop.narrative_intro}
          </p>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="stats-banner">
        <div className="stat-glass">
          <div className="stat-glass-icon">◈</div>
          <div className="stat-glass-value">{unlocked}</div>
          <div className="stat-glass-label">Issued</div>
        </div>
        <div className="stat-glass stat-glass-green">
          <div className="stat-glass-icon">◉</div>
          <div className="stat-glass-value">{completed}</div>
          <div className="stat-glass-label">Closed</div>
        </div>
        <div className="stat-glass stat-glass-amber">
          <div className="stat-glass-icon">⬡</div>
          <div className="stat-glass-value">{inProgress}</div>
          <div className="stat-glass-label">Active</div>
        </div>
        <div className="stat-glass stat-glass-primary stat-glass-wide">
          <div className="stat-glass-icon">◇</div>
          <div className="stat-glass-value">{overallPct}%</div>
          <div className="stat-glass-label">Case Status</div>
        </div>
      </div>

      {/* ── Operation progress bar ── */}
      <div className="glass-card dash-progress-card">
        <div className="dash-progress-header">
          <span className="section-label">Case Progress</span>
          <span className="dash-progress-fraction">{completed} / {total}</span>
        </div>
        <div className="progress-track progress-track-lg">
          <div className="progress-fill progress-fill-glow" style={{ width: `${overallPct}%` }} />
        </div>
        {drops.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {drops.map((d) => (
              <span key={d.id} style={{
                fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 8px', borderRadius: 3,
                background: d.is_unlocked ? 'var(--primary)' : 'var(--surface-2)',
                color: d.is_unlocked ? '#000' : 'var(--muted)',
                opacity: d.is_unlocked ? 1 : 0.5,
              }}>
                DROP {d.number}
              </span>
            ))}
          </div>
        )}
        <div className="dash-progress-footer" style={{ marginTop: 8 }}>
          <span>{completed} of {total} taskings complete</span>
          <span>{overallPct}%</span>
        </div>
      </div>

      {/* ── Squad roster ── */}
      {squad && (
        <div className="glass-card squad-card squad-card-accent">
          <div className="squad-card-header">
            <div className="squad-badge-large" style={victim ? { background: `${victim.color}25`, borderColor: victim.color } : {}}>
              <span className="squad-badge-num" style={victim ? { color: victim.color } : {}}>{squad.number}</span>
            </div>
            <div className="squad-card-title">
              <div className="squad-number">Squad {squad.number}{squad.name ? ` · ${squad.name}` : ''}</div>
              <div className="squad-count">{(squad.students ?? []).length} assigned operator{(squad.students ?? []).length !== 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="squad-members">
            {(squad.students ?? []).map((m) => (
              <div
                key={m.id}
                className={`squad-member${m.id === user?.id ? ' squad-member-self' : ''}`}
              >
                <div className="member-avatar">{m.first_name?.[0]}{m.last_name?.[0]}</div>
                <div>
                  <span>{m.first_name} {m.last_name}{m.id === user?.id ? ' (you)' : ''}</span>
                  {m.professional_role && (
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                      {PROF_ROLE_LABELS[m.professional_role] ?? m.professional_role}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active taskings ── */}
      {inProgress > 0 && (
        <div className="glass-card dash-inprogress-card">
          <div className="section-label" style={{ marginBottom: 14 }}>Active Taskings — Awaiting Completion</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {assignments
              .filter((a) => (a.progress ?? 0) > 0 && (a.progress ?? 0) < 100)
              .map((a) => (
                <div key={a.id} className="dash-progress-row">
                  <span className="dash-progress-title">{a.title}</span>
                  {a.drop_number && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginRight: 8, whiteSpace: 'nowrap' }}>
                      DROP {a.drop_number}
                    </span>
                  )}
                  <div className="progress-track" style={{ flex: 1 }}>
                    <div className="progress-fill progress-fill-glow" style={{ width: `${a.progress}%` }} />
                  </div>
                  <span className="dash-progress-pct">{a.progress}%</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
