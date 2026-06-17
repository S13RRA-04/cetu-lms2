import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DecryptText from '../components/DecryptText.jsx';
import DataStream  from '../components/DataStream.jsx';

// Tracks which drops a user has already seen
export function seenKey(userId) {
  return `pact_drops_seen_v1_${userId}`;
}
export function getSeenDropIds(userId) {
  try { return JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]'); }
  catch { return []; }
}
export function markDropSeen(userId, dropId) {
  const seen = getSeenDropIds(userId);
  if (!seen.includes(dropId)) {
    localStorage.setItem(seenKey(userId), JSON.stringify([...seen, dropId]));
  }
}

// Blinking signal indicator
function SignalDot() {
  return (
    <motion.span
      className="tx-signal-dot"
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// Horizontal noise bar (decorative)
function NoiseLine() {
  return <div className="tx-noise-line" />;
}

export default function TransmissionInterceptor({ drop, onAcknowledge }) {
  const [stage, setStage] = useState(0);
  // Stages:
  // 0 = blank
  // 1 = "INCOMING TRANSMISSION" signal
  // 2 = origin header (OPERATION BRKR — COMMAND)
  // 3 = drop title
  // 4 = narrative text
  // 5 = button

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 1100),
      setTimeout(() => setStage(3), 2000),
      setTimeout(() => setStage(4), 3000),
      setTimeout(() => setStage(5), 4400),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="tx-root">
      <DataStream color="#00b0ff" opacity={0.10} fontSize={11} speedScale={1.6} />
      <div className="ind-scanlines" />
      <div className="tx-interference" />

      <div className="tx-body">

        {/* Signal header */}
        <AnimatePresence>
          {stage >= 1 && (
            <motion.div
              className="tx-signal-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              <SignalDot />
              <span className="tx-signal-label">INCOMING TRANSMISSION</span>
            </motion.div>
          )}
        </AnimatePresence>

        {stage >= 1 && <NoiseLine />}

        {/* Origin */}
        <AnimatePresence>
          {stage >= 2 && (
            <motion.div
              className="tx-origin"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              OPERATION BRKR · COMMAND
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drop number + title */}
        <AnimatePresence>
          {stage >= 3 && (
            <motion.div
              className="tx-drop-id"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <span className="tx-drop-num">
                <DecryptText text={`DROP ${drop.number}`} speed={30} hold={3} />
              </span>
              {drop.title && (
                <span className="tx-drop-title chroma">
                  <DecryptText text={drop.title.toUpperCase()} speed={22} hold={6} delay={200} />
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Narrative */}
        <AnimatePresence>
          {stage >= 4 && drop.narrative_intro && (
            <motion.div
              className="tx-narrative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <div className="tx-narrative-label">COMMAND BRIEFING</div>
              <p className="tx-narrative-body">{drop.narrative_intro}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Acknowledge */}
        <AnimatePresence>
          {stage >= 5 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <button className="ind-btn ind-btn--primary tx-ack-btn" onClick={onAcknowledge}>
                ACKNOWLEDGE TRANSMISSION <span className="ind-btn-arrow">→</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Bottom classification bar reuse */}
      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
