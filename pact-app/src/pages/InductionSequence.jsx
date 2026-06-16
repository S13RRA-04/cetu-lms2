import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getVictim } from '../constants/victims.js';

const PROF_ROLE_LABELS = {
  special_agent:                    'Special Agent',
  intelligence_analyst:             'Intelligence Analyst',
  operational_support_sos:          'Operational Support Specialist',
  operational_support_da:           'Data Analyst',
  supervisory_special_agent:        'Supervisory Special Agent',
  supervisory_intelligence_analyst: 'Supervisory Intelligence Analyst',
  task_force_officer:               'Task Force Officer',
};

// Panel 0 — Classification acknowledgment
function PanelClassification({ onAdvance }) {
  return (
    <motion.div className="ind-panel"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="ind-stamp">SENSITIVE // LAW ENFORCEMENT SENSITIVE</div>

      <div className="ind-p0-body">
        <div className="ind-op-label">OPERATION BRKR</div>
        <h1 className="ind-p0-title">TASK FORCE BRIEFING</h1>
        <p className="ind-p0-sub">Digital Forensics &amp; Incident Response Exercise</p>

        <div className="ind-divider" />

        <p className="ind-prose">
          You have been assigned to an active federal investigation simulation.
          This system contains sensitive case materials, classified intelligence, and
          operational taskings related to a real-world cyber incident scenario.
        </p>
        <p className="ind-prose">
          Maintain operational security throughout this exercise.
          Do not discuss case details outside of authorized channels.
          All activity within this system is logged.
        </p>
      </div>

      <button className="ind-btn" onClick={onAdvance}>
        ACKNOWLEDGE &amp; PROCEED <span className="ind-btn-arrow">→</span>
      </button>
    </motion.div>
  );
}

// Panel 1 — Assignment order
function PanelAssignment({ user, enrollment, onAdvance }) {
  const squad  = enrollment?.squad;
  const victim = getVictim(squad?.number);
  const role   = PROF_ROLE_LABELS[user?.professional_role] ?? 'Special Agent';
  const today  = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <motion.div className="ind-panel"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="ind-stamp">ASSIGNMENT ORDER</div>

      <div className="ind-memo">
        <div className="ind-memo-row"><span>FROM</span><span>Task Force BRKR Command, Cyber Operations Division</span></div>
        <div className="ind-memo-row"><span>TO</span><span>{user?.first_name} {user?.last_name}</span></div>
        <div className="ind-memo-row"><span>RE</span><span>Task Force Assignment — Operation BRKR</span></div>
        <div className="ind-memo-row"><span>DATE</span><span>{today}</span></div>
        <div className="ind-memo-divider" />
        <div className="ind-memo-row"><span>DESIGNATION</span><span className="ind-memo-value">{role.toUpperCase()}</span></div>
        {squad ? (
          <div className="ind-memo-row">
            <span>UNIT</span>
            <span className="ind-memo-value" style={{ color: victim?.color }}>
              SQUAD {squad.number}{squad.name ? ` — ${squad.name}` : ''}
              {victim ? ` · ${victim.code}` : ''}
            </span>
          </div>
        ) : (
          <div className="ind-memo-row"><span>UNIT</span><span className="ind-memo-pending">PENDING ASSIGNMENT</span></div>
        )}
      </div>

      <p className="ind-prose" style={{ marginTop: 28 }}>
        Your assignment takes effect immediately upon acknowledgment of this order.
        You are expected to respond to all taskings issued through this system.
        Failure to complete assigned taskings may affect operational standing.
      </p>

      <button className="ind-btn" onClick={onAdvance}>
        ACKNOWLEDGE ASSIGNMENT <span className="ind-btn-arrow">→</span>
      </button>
    </motion.div>
  );
}

// Panel 2 — Target reveal (THE moment)
function PanelTarget({ enrollment, onAdvance }) {
  const squad  = enrollment?.squad;
  const victim = getVictim(squad?.number);

  const [stage, setStage] = useState(0);
  // Stages: 0=blank, 1=accessing, 2=name reveal, 3=details, 4=incident, 5=button

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 400),
      setTimeout(() => setStage(2), 1400),
      setTimeout(() => setStage(3), 2400),
      setTimeout(() => setStage(4), 3200),
      setTimeout(() => setStage(5), 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!victim) {
    return (
      <motion.div className="ind-panel"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="ind-stamp">INVESTIGATION TARGET</div>
        <div className="ind-target-pending">
          <div className="ind-target-pending-label">ASSIGNMENT PENDING</div>
          <p className="ind-prose" style={{ marginTop: 16 }}>
            Your investigation target will be assigned by your supervising agent.
            Check back after your squad assignment is confirmed.
          </p>
        </div>
        <button className="ind-btn" onClick={onAdvance}>CONTINUE <span className="ind-btn-arrow">→</span></button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="ind-panel ind-panel--target"
      style={{ '--victim-color': victim.color, '--victim-dim': victim.colorDim }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Left color bar that reveals with the target */}
      <motion.div
        className="ind-target-bar"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={stage >= 2 ? { scaleY: 1, opacity: 1 } : { scaleY: 0, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ background: victim.color }}
      />

      <div className="ind-target-body">
        {/* Accessing */}
        <motion.div
          className="ind-target-accessing"
          initial={{ opacity: 0 }}
          animate={stage >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          ACCESSING RESTRICTED CASE FILE...
        </motion.div>

        {/* Classification */}
        <motion.div
          className="ind-stamp"
          style={{ marginTop: 24, marginBottom: 12 }}
          initial={{ opacity: 0 }}
          animate={stage >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          YOUR INVESTIGATION TARGET
        </motion.div>

        {/* Victim name — the reveal */}
        <motion.div
          className="ind-target-name"
          style={{ color: victim.color }}
          initial={{ opacity: 0, y: 12 }}
          animate={stage >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {victim.name}
        </motion.div>

        {/* Sector / code */}
        <motion.div
          className="ind-target-meta"
          initial={{ opacity: 0 }}
          animate={stage >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="ind-target-meta-pill" style={{ borderColor: victim.color, color: victim.color }}>
            {victim.sector}
          </span>
          <span className="ind-target-meta-pill">
            CODE: {victim.code}
          </span>
          <span className="ind-target-meta-pill ind-target-meta-status">
            STATUS: ACTIVE INVESTIGATION
          </span>
        </motion.div>

        {/* Incident summary */}
        <motion.div
          className="ind-target-incident"
          initial={{ opacity: 0 }}
          animate={stage >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="ind-target-incident-label">INCIDENT SUMMARY</div>
          <p>{victim.incident}</p>
          <p style={{ marginTop: 10 }}>
            Your squad has primary investigative responsibility for this target.
            Evidence, intelligence, and taskings will be delivered through this system as the investigation develops.
          </p>
        </motion.div>

        {/* Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={stage >= 5 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginTop: 32 }}
        >
          <button className="ind-btn" style={{ borderColor: victim.color, color: victim.color }} onClick={onAdvance}>
            ACKNOWLEDGED <span className="ind-btn-arrow">→</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Panel 3 — Begin
function PanelBegin({ onComplete }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setTimeout(() => setReady(true), 800); }, []);

  return (
    <motion.div className="ind-panel"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="ind-op-label" style={{ marginBottom: 20 }}>OPERATION BRKR</div>

      <div className="ind-begin-body">
        <p className="ind-prose">
          Command will issue taskings as the investigation develops. Evidence packages and
          intelligence reports will be delivered through the Case File system. All field
          reports are submitted through the tasking system.
        </p>
        <p className="ind-prose">
          Work the evidence. Trust your squad. Follow the leads.
        </p>
      </div>

      <div className="ind-begin-statement">
        YOUR INVESTIGATION BEGINS NOW.
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <button className="ind-btn ind-btn--primary" onClick={onComplete}>
          ENTER OPERATIONS CENTER <span className="ind-btn-arrow">→</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function InductionSequence({ user, enrollment, onComplete }) {
  const [panel, setPanel] = useState(0);
  const next = () => setPanel(p => p + 1);

  const panels = [
    <PanelClassification key="p0" onAdvance={next} />,
    <PanelAssignment     key="p1" user={user} enrollment={enrollment} onAdvance={next} />,
    <PanelTarget         key="p2" enrollment={enrollment} onAdvance={next} />,
    <PanelBegin          key="p3" onComplete={onComplete} />,
  ];

  return (
    <div className="ind-root">
      {/* Subtle scan-line overlay */}
      <div className="ind-scanlines" />

      <AnimatePresence mode="wait">
        {panels[panel]}
      </AnimatePresence>

      {/* Panel indicator */}
      <div className="ind-progress">
        {panels.map((_, i) => (
          <div key={i} className={`ind-progress-dot${i === panel ? ' active' : ''}${i < panel ? ' done' : ''}`} />
        ))}
      </div>
    </div>
  );
}
