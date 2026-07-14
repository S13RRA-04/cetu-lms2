import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getVictimByCode } from '../constants/victims.js';
import DecryptText from '../components/DecryptText.jsx';
import DataStream  from '../components/DataStream.jsx';

export function targetSeenKey(userId) {
  return `pact_target_seen_v1_${userId}`;
}

export default function TargetRevealInterceptor({ enrollment, onAcknowledge }) {
  const squad  = enrollment?.squad;
  const victim = squad ? getVictimByCode(squad.victim_code) : null;

  const [stage, setStage]   = useState(0);
  const [flashed, setFlashed] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 400),
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setStage(3), 2000),
      setTimeout(() => setStage(4), 2800),
      setTimeout(() => setStage(5), 3800),
      setTimeout(() => setStage(6), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (stage === 3 && !flashed) setFlashed(true);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!victim) return null;

  return (
    <div
      className="tx-root ind-root"
      style={{ '--victim-color': victim.color, '--victim-dim': victim.colorDim }}
    >
      <DataStream color={victim.color} opacity={0.13} fontSize={11} speedScale={1.5} />
      <div className="ind-scanlines" />
      <div className="tx-interference" />

      {/* Flash on name reveal */}
      {flashed && (
        <motion.div
          style={{ position: 'absolute', inset: 0, background: victim.color, zIndex: 10, pointerEvents: 'none' }}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      )}

      <div className="tx-body" style={{ maxWidth: 680 }}>

        {/* Header signal */}
        <motion.div
          className="tx-signal-header"
          initial={{ opacity: 0 }}
          animate={stage >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{ marginBottom: 24 }}
        >
          <motion.span
            className="tx-signal-dot"
            style={{ background: victim.color, boxShadow: `0 0 10px ${victim.color}` }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
          <span className="tx-signal-label" style={{ color: victim.color }}>
            COMMAND AUTHORIZATION RECEIVED
          </span>
        </motion.div>

        {/* Stamp */}
        <motion.div
          className="ind-stamp"
          initial={{ opacity: 0 }}
          animate={stage >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 16 }}
        >
          YOUR INVESTIGATION TARGET HAS BEEN ASSIGNED
        </motion.div>

        {/* Victim name — THE reveal */}
        <motion.div
          className="ind-target-name chroma-xl"
          style={{ color: victim.color, textShadow: `0 0 30px ${victim.color}, 0 0 80px ${victim.color}88` }}
          initial={{ opacity: 0, y: 20, scale: 0.93 }}
          animate={stage >= 3 ? { opacity: 1, y: 0, scale: [0.93, 1.05, 1] } : { opacity: 0, y: 20, scale: 0.93 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {stage >= 3 && <DecryptText text={victim.name} speed={20} hold={5} delay={60} />}
        </motion.div>

        {/* Meta pills */}
        <motion.div
          className="ind-target-meta"
          initial={{ opacity: 0 }}
          animate={stage >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="ind-target-meta-pill" style={{ borderColor: victim.color, color: victim.color }}>
            {victim.sector}
          </span>
          <span className="ind-target-meta-pill">CODE: {victim.code}</span>
          <span className="ind-target-meta-pill ind-target-meta-status threat-blink">
            ● STATUS: ACTIVE INVESTIGATION
          </span>
        </motion.div>

        {/* Incident */}
        <motion.div
          className="ind-target-incident"
          initial={{ opacity: 0, y: 8 }}
          animate={stage >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 36 }}
        >
          <div className="ind-target-incident-label">INCIDENT SUMMARY</div>
          <p>{victim.incident}</p>
          <p style={{ marginTop: 10 }}>
            Your squad has primary investigative responsibility. Evidence, intelligence,
            and taskings will be delivered through this system as the investigation develops.
          </p>
        </motion.div>

        {/* Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={stage >= 6 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            className="ind-btn ind-btn--primary"
            style={{ borderColor: victim.color, color: victim.color, boxShadow: `0 0 18px ${victim.color}44` }}
            onClick={onAcknowledge}
          >
            BEGIN INVESTIGATION <span className="ind-btn-arrow">→</span>
          </button>
        </motion.div>

      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
