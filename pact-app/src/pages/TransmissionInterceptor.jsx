import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DecryptText from '../components/DecryptText.jsx';
import DataStream  from '../components/DataStream.jsx';

// Tracks which drops a user has already seen.
// Key includes updatedAt so that updating a drop (e.g. adding cipher) re-shows it.
export function seenKey(userId) {
  return `pact_drops_seen_v2_${userId}`;
}
export function dropSeenId(drop) {
  return `${drop.id}:${drop.updatedAt ?? ''}`;
}
export function getSeenDropIds(userId) {
  try { return JSON.parse(localStorage.getItem(seenKey(userId)) ?? '[]'); }
  catch { return []; }
}
export function markDropSeen(userId, drop) {
  const seen = getSeenDropIds(userId);
  const key  = dropSeenId(drop);
  if (!seen.includes(key)) {
    localStorage.setItem(seenKey(userId), JSON.stringify([...seen, key]));
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

/* ── Static/glitch pre-stage ──────────────────────────────────────────────── */
function TxStaticOverlay() {
  return (
    <motion.div
      className="tx-static-overlay"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="tx-static-bars" />
      <div className="tx-static-label">
        <DecryptText text="CARRIER SIGNAL DETECTED — DECRYPTING" speed={28} hold={1} />
      </div>
      <div className="tx-static-coords">
        FREQ 14.235 MHz · BAND: ENCRYPTED · ORIGIN: CLASSIFIED
      </div>
    </motion.div>
  );
}

export default function TransmissionInterceptor({ drop, onAcknowledge, idLine = null, narrativeLabel = 'COMMAND BRIEFING' }) {
  const [stage,      setStage]      = useState(0);
  const [showStatic, setShowStatic] = useState(true);
  // Stages (static clears at ~850ms, then reveal sequence begins):
  // 0 = static overlay (pre-stage)
  // 1 = "INCOMING TRANSMISSION" signal
  // 2 = origin header
  // 3 = drop title
  // 4 = narrative text
  // 5 = button

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowStatic(false), 850),
      setTimeout(() => setStage(1),          950),
      setTimeout(() => setStage(2),          1800),
      setTimeout(() => setStage(3),          2700),
      setTimeout(() => setStage(4),          3700),
      setTimeout(() => setStage(5),          5100),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="tx-root">
      <DataStream color="#00b0ff" opacity={0.10} fontSize={11} speedScale={1.6} />
      <div className="ind-scanlines" />
      <div className="tx-interference" />

      <AnimatePresence>
        {showStatic && <TxStaticOverlay />}
      </AnimatePresence>

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
                <DecryptText text={idLine ?? `DROP ${drop.number}`} speed={30} hold={3} />
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
              <div className="tx-narrative-label">{narrativeLabel}</div>
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
