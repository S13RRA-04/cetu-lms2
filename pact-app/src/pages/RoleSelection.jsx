import { useState } from 'react';
import { motion } from 'motion/react';
import { submitOnboarding } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';
import { PROFESSIONAL_ROLES as ROLES } from '../constants/professionalRoles.js';
import { CERTIFICATIONS } from '../constants/certifications.js';

export default function RoleSelection({ user }) {
  const [step, setStep] = useState('role');
  const [selected,  setSelected]  = useState(null);
  const [certs, setCerts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const setUser = useAuthStore((s) => s.setUser);

  const toggleCert = (value) => {
    setCerts((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitOnboarding(selected, certs);
      setUser(updated);
    } catch {
      setError('Unable to save your role designation. Please try again.');
      setSubmitting(false);
    }
  };

  if (step === 'certs') {
    return (
      <div className="ind-root">
        <div className="ind-scanlines" />
        <motion.div className="ind-panel rsel-panel"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="ind-stamp">ASSIGNMENT ORDER — TRAINING & CERTIFICATIONS</div>

          <div className="ind-op-label">OPERATION BRKR</div>
          <h1 className="ind-p0-title" style={{ fontSize: 24 }}>SELECT ANY RELEVANT CERTIFICATIONS</h1>
          <p className="ind-prose" style={{ maxWidth: 620 }}>
            Optional — select any specialized training or certifications you hold. Some taskings
            are routed to specialists regardless of assigned role (e.g. cryptocurrency forensics).
            You can select none and continue.
          </p>

          <div className="rsel-grid">
            {CERTIFICATIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`rsel-card${certs.includes(c.value) ? ' rsel-card--selected' : ''}`}
                onClick={() => toggleCert(c.value)}
              >
                <span className="rsel-card-label">{c.label}</span>
                <span className="rsel-card-blurb">{c.blurb}</span>
              </button>
            ))}
          </div>

          {error && <p className="ind-prose" style={{ color: '#f87171' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button className="ind-btn" onClick={() => setStep('role')} disabled={submitting}>
              ← BACK
            </button>
            <button
              className="ind-btn ind-btn--primary"
              disabled={submitting}
              onClick={handleConfirm}
            >
              {submitting ? 'CONFIRMING...' : 'CONFIRM DESIGNATION'} <span className="ind-btn-arrow">→</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="ind-root">
      <div className="ind-scanlines" />
      <motion.div className="ind-panel rsel-panel"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="ind-stamp">ASSIGNMENT ORDER — DESIGNATION REQUIRED</div>

        <div className="ind-op-label">OPERATION BRKR</div>
        <h1 className="ind-p0-title" style={{ fontSize: 24 }}>SELECT YOUR PROFESSIONAL DESIGNATION</h1>
        <p className="ind-prose" style={{ maxWidth: 620 }}>
          {user?.first_name}, before you can be inducted onto your squad, Command requires your
          professional role on record. This determines which taskings are routed to you throughout
          the investigation. Choose carefully — this selection is permanent for the exercise.
        </p>

        <div className="rsel-grid">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`rsel-card${selected === r.value ? ' rsel-card--selected' : ''}`}
              onClick={() => setSelected(r.value)}
            >
              <span className="rsel-card-label">{r.label}</span>
              <span className="rsel-card-blurb">{r.blurb}</span>
            </button>
          ))}
        </div>

        {error && <p className="ind-prose" style={{ color: '#f87171' }}>{error}</p>}

        <button
          className="ind-btn ind-btn--primary"
          style={{ marginTop: 28 }}
          disabled={!selected}
          onClick={() => setStep('certs')}
        >
          NEXT <span className="ind-btn-arrow">→</span>
        </button>
      </motion.div>
    </div>
  );
}
