import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function DropAlert({ drop, onView, onDismiss }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="drop-alert"
          initial={{ opacity: 0, x: 80, scale: 0.92 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        >
          {/* Scanline overlay */}
          <div className="drop-alert-scanlines" />

          {/* Pulsing border glow */}
          <motion.div
            className="drop-alert-glow"
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Header */}
          <div className="drop-alert-header">
            <div className="drop-alert-signal">
              {/* LED with ring pulse */}
              <span className="drop-alert-led-wrap">
                <motion.span
                  className="drop-alert-led-ring"
                  animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.span
                  className="drop-alert-led"
                  animate={{ opacity: [1, 0.15, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              </span>
              INCOMING TRANSMISSION
            </div>
            <button className="drop-alert-close" onClick={onDismiss} title="Dismiss">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Noise interference line */}
          <div className="drop-alert-noise" />

          {/* Body */}
          <div className="drop-alert-body">
            <div className="drop-alert-drop-label">DROP {String(drop.number).padStart(2,'0')}</div>
            {drop.title && (
              <div className="drop-alert-title">{drop.title.toUpperCase()}</div>
            )}
            <div className="drop-alert-sub">
              Command has issued a new briefing package. Stand by for incoming intelligence.
            </div>
          </div>

          {/* Actions */}
          <div className="drop-alert-actions">
            <button className="drop-alert-btn-primary" onClick={onView}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              VIEW TRANSMISSION
            </button>
            <button className="drop-alert-btn-secondary" onClick={onDismiss}>
              ACKNOWLEDGE
            </button>
          </div>

          {/* Animated border sweep */}
          <motion.div
            className="drop-alert-border-sweep"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
