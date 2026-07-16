import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DecryptText from '../components/DecryptText.jsx';
import DataStream  from '../components/DataStream.jsx';

/* Shown once per drop, after the drop's narrative is acknowledged, when the
   drop defines location_options and the student hasn't self-reported yet
   (drop.location_selection is null). Location-tagged assignments/content/
   packages for this drop stay filtered to whichever option is chosen here —
   see backend utils/dropLocation.js. */
export default function LocationChoiceInterceptor({ drop, onChoose }) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const options = drop.location_options ?? [];

  const submit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onChoose(selected);
    } catch {
      setError('SUBMISSION FAILED — TRY AGAIN');
      setSubmitting(false);
    }
  };

  return (
    <div className="tx-root">
      <DataStream color="#00b0ff" opacity={0.10} fontSize={11} speedScale={1.6} />
      <div className="ind-scanlines" />
      <div className="tx-interference" />

      <div className="tx-body">
        <motion.div
          className="tx-signal-header"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <span className="tx-signal-label">FIELD REPORT REQUIRED</span>
        </motion.div>

        <div className="tx-noise-line" />

        <motion.div
          className="tx-origin"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          DROP {drop.number} · SEARCH SCENE ASSIGNMENT
        </motion.div>

        <motion.div
          className="tx-drop-id"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
        >
          <span className="tx-drop-title chroma">
            <DecryptText text="WHICH LOCATION DID YOUR SQUAD SEARCH?" speed={22} hold={6} />
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
            Report the physical search scene your squad worked. You will only receive the
            evidence and analysis questions for that location.
          </p>
        </motion.div>

        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18, width: '100%', maxWidth: 480 }}
          >
            {options.map((opt) => (
              <button
                key={opt.code}
                type="button"
                className={`ind-btn${selected === opt.code ? ' ind-btn--primary' : ''}`}
                onClick={() => setSelected(opt.code)}
                disabled={submitting}
                style={{ textAlign: 'left', width: '100%' }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.85 }}
          style={{ marginTop: 18 }}
        >
          <button
            className="ind-btn ind-btn--primary tx-ack-btn"
            onClick={submit}
            disabled={!selected || submitting}
          >
            {submitting ? 'FILING REPORT...' : <>CONFIRM SEARCH LOCATION <span className="ind-btn-arrow">→</span></>}
          </button>
          {error && <p className="dpg-status wrong" style={{ marginTop: 10 }}>{error}</p>}
        </motion.div>
      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
