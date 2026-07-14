import { useState } from 'react';
import { motion } from 'motion/react';
import { submitOnboarding } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';

const ROLES = [
  { value: 'supervisory_special_agent',        label: 'Squad Lead / Acting SSA',              blurb: 'Keeps the squad focused, assigns work, and prepares the Command Post briefing.' },
  { value: 'special_agent',                     label: 'Case Agent',                           blurb: 'Determines investigative predication, victim impact, and legal/investigative next steps.' },
  { value: 'cyber_analyst',                     label: 'Cyber Analyst',                        blurb: 'Analyzes technical activity, IOCs, and observed behavior without over-attributing.' },
  { value: 'operational_support_da',            label: 'Data Analyst',                         blurb: 'Normalizes the timeline, structures evidence, and correlates entities across sources.' },
  { value: 'intelligence_analyst',              label: 'Intelligence Analyst',                 blurb: 'Develops hypotheses, identifies intelligence gaps, and guards against premature attribution.' },
  { value: 'operational_support_sos',           label: 'SOS / Case Coordinator',                blurb: 'Maintains the case organization, evidence index, lead tracker, and briefing hygiene.' },
  { value: 'task_force_officer',                label: 'TFO / Field Lead',                     blurb: 'Identifies physical-world, victim, vendor, and records-based follow-up leads.' },
  { value: 'digital_evidence_lead',             label: 'Digital Evidence Lead / CART Liaison', blurb: 'Identifies what digital evidence should be preserved, collected, or imaged.' },
  { value: 'supervisory_intelligence_analyst',  label: 'Supervisory Intelligence Analyst',      blurb: 'Senior intelligence oversight across the squad’s hypotheses and analytic products.' },
];

export default function RoleSelection({ user }) {
  const [selected,  setSelected]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const setUser = useAuthStore((s) => s.setUser);

  const handleConfirm = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitOnboarding(selected);
      setUser(updated);
    } catch {
      setError('Unable to save your role designation. Please try again.');
      setSubmitting(false);
    }
  };

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
          disabled={!selected || submitting}
          onClick={handleConfirm}
        >
          {submitting ? 'CONFIRMING...' : 'CONFIRM DESIGNATION'} <span className="ind-btn-arrow">→</span>
        </button>
      </motion.div>
    </div>
  );
}
