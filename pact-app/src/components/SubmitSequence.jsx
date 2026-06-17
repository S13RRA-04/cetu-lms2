import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export default function SubmitSequence({ color }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 0);
    const t2 = setTimeout(() => setStep(2), 560);
    const t3 = setTimeout(() => setStep(3), 1180);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  const lines = [
    'ENCRYPTING FIELD REPORT...',
    'ESTABLISHING SECURE CHANNEL...',
    'TRANSMITTING TO COMMAND...',
  ];

  return (
    <div className="ap-submit-seq">
      {lines.map((text, i) => (
        <motion.div
          key={i}
          className="ap-submit-line"
          initial={{ opacity: 0, x: -12 }}
          animate={step > i ? { opacity: 1, x: 0 } : { opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <span className="ap-submit-cursor">›</span>
          <span>{text}</span>
          {step > i + 1 && (
            <span style={{ color, marginLeft: 12, fontSize: 10, letterSpacing: '.08em' }}>SENT</span>
          )}
        </motion.div>
      ))}
      <motion.div
        style={{
          height: 2, borderRadius: 1, marginTop: 14,
          background: color, transformOrigin: 'left',
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: step / 3 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
}
