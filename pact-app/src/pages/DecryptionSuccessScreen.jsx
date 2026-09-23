import { motion } from 'motion/react';
import DecryptText from '../components/DecryptText.jsx';
import DataStream  from '../components/DataStream.jsx';

// Shown once a drop's entire gate chain — Signal, Vault, and every puzzle
// stage in its `puzzles` array — has been cleared and the closing
// TransmissionInterceptor narrative has been acknowledged (see
// AppShell.jsx's handleTransmissionAck/handleLocationChoice, which set
// `decryptedDrop` at that point instead of just dismissing the gate).
// Distinct from TransmissionInterceptor itself: that screen reveals the
// drop's narrative; this one confirms the decryption work is actually done
// and gives the student a clear next action instead of silently dropping
// them back wherever they were.
export default function DecryptionSuccessScreen({ drop, onEnterCaseFile }) {
  return (
    <div className="tx-root">
      <DataStream color="#22c55e" opacity={0.10} fontSize={11} speedScale={1.6} />
      <div className="ind-scanlines" />
      <div className="tx-interference" />

      <div className="tx-body">
        <motion.div
          className="tx-signal-header"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <span className="tx-signal-label tx-signal-label--success">DECRYPTION COMPLETE</span>
        </motion.div>

        <div className="tx-noise-line" />

        <motion.div
          className="tx-origin"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          DROP {drop?.number} · ALL LAYERS CLEARED
        </motion.div>

        <motion.div
          className="tx-drop-id"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
        >
          <span className="tx-drop-title chroma">
            <DecryptText text="EVIDENCE PACKAGE UNLOCKED" speed={22} hold={6} />
          </span>
        </motion.div>

        <motion.div
          className="tx-narrative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="tx-narrative-label">OPERATOR TASKING</div>
          <p className="tx-narrative-body">
            Every cipher and gate for this drop has been verified. The evidence package is now
            in the Case File, ready for review.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          style={{ marginTop: 18 }}
        >
          <button className="ind-btn ind-btn--primary tx-ack-btn" onClick={onEnterCaseFile}>
            ENTER CASE FILE <span className="ind-btn-arrow">→</span>
          </button>
        </motion.div>
      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
