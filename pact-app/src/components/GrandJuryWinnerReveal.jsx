import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import DecryptText from './DecryptText.jsx';
import DataStream  from './DataStream.jsx';

export default function GrandJuryWinnerReveal({ name, onAcknowledge }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 1000),
      setTimeout(() => setStage(3), 1800),
      setTimeout(() => setStage(4), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="tx-root ind-root" style={{ '--victim-color': 'var(--primary)', '--victim-dim': 'var(--primary)' }}>
      <DataStream color="var(--primary)" opacity={0.13} fontSize={11} speedScale={1.5} />
      <div className="ind-scanlines" />
      <div className="tx-interference" />

      <div className="tx-body" style={{ maxWidth: 680, textAlign: 'center' }}>
        <motion.div
          className="tx-signal-header"
          initial={{ opacity: 0 }}
          animate={stage >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.35 }}
          style={{ marginBottom: 24, justifyContent: 'center' }}
        >
          <motion.span
            className="tx-signal-dot"
            style={{ background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
          <span className="tx-signal-label" style={{ color: 'var(--primary)' }}>
            GRAND JURY SELECTION
          </span>
        </motion.div>

        <motion.div
          className="ind-stamp"
          initial={{ opacity: 0 }}
          animate={stage >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 16 }}
        >
          THE WHEEL HAS SPOKEN
        </motion.div>

        <motion.div
          className="ind-target-name chroma-xl"
          style={{ color: 'var(--primary)', textShadow: '0 0 30px var(--primary), 0 0 80px var(--primary)' }}
          initial={{ opacity: 0, y: 20, scale: 0.93 }}
          animate={stage >= 2 ? { opacity: 1, y: 0, scale: [0.93, 1.05, 1] } : { opacity: 0, y: 20, scale: 0.93 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {stage >= 2 && <DecryptText text="YOU'VE BEEN SELECTED" speed={20} hold={5} delay={60} />}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={stage >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 36, marginTop: 20 }}
        >
          <div className="ind-target-incident-label">PRESENTING TO THE GRAND JURY</div>
          <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--bright, #c8d8e8)', marginTop: 8 }}>{name}</p>
          <p style={{ marginTop: 10 }}>
            Your squad has selected you to present the case. Gather your evidence and prepare to make your argument.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={stage >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            className="ind-btn ind-btn--primary"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)', boxShadow: '0 0 18px var(--primary)44' }}
            onClick={onAcknowledge}
          >
            ACKNOWLEDGE <span className="ind-btn-arrow">→</span>
          </button>
        </motion.div>
      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
