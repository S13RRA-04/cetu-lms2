import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import useAuthStore from '../store/authStore.js';

const PROFESSIONAL_ROLES = [
  { value: 'special_agent',                    label: 'Special Agent' },
  { value: 'intelligence_analyst',             label: 'Intelligence Analyst' },
  { value: 'operational_support_sos',          label: 'Operational Support (SOS/TS)' },
  { value: 'operational_support_da',           label: 'Operational Support (Data Analyst)' },
  { value: 'supervisory_special_agent',        label: 'Supervisory Special Agent' },
  { value: 'supervisory_intelligence_analyst', label: 'Supervisory Intelligence Analyst' },
  { value: 'task_force_officer',               label: 'Task Force Officer' },
];

const CERTIFICATIONS = [
  { value: 'DExT', label: 'DExT — Digital Evidence Examiner Training' },
  { value: 'CART', label: 'CART — Computer Analysis and Response Team' },
  { value: 'DFE',  label: 'DFE — Digital Forensic Examiner' },
];

export default function OnboardingPage() {
  const navigate    = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [step,   setStep]   = useState(1);
  const [profRole, setProfRole] = useState(user?.professional_role ?? '');
  const [certs,  setCerts]  = useState(user?.certifications ?? []);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const toggleCert = (value) => {
    setCerts((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const finish = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.post('/users/me/onboarding', {
        professional_role: profRole || null,
        certifications:    certs,
      }).then((r) => r.data);
      updateUser(updated);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 480, padding: 32 }}>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[1, 2].map((n) => (
            <div key={n} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: n <= step ? 'var(--primary)' : 'var(--border)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h2 style={{ marginBottom: 4 }}>Welcome, {user?.first_name}.</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>Let's get your profile set up. What is your professional role?</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {PROFESSIONAL_ROLES.map((r) => (
                <label key={r.value} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${profRole === r.value ? 'var(--primary)' : 'var(--border)'}`,
                  background: profRole === r.value ? 'var(--primary-subtle, rgba(59,130,246,0.06))' : 'transparent',
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  <input
                    type="radio"
                    name="professional_role"
                    value={r.value}
                    checked={profRole === r.value}
                    onChange={() => setProfRole(r.value)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>

            <div className="flex-end" style={{ gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => { setProfRole(''); setStep(2); }}>
                Skip
              </button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                Next
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ marginBottom: 4 }}>Cyber Certifications</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>Select any certifications you currently hold. You can update these later in your profile.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {CERTIFICATIONS.map((c) => (
                <label key={c.value} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${certs.includes(c.value) ? 'var(--primary)' : 'var(--border)'}`,
                  background: certs.includes(c.value) ? 'var(--primary-subtle, rgba(59,130,246,0.06))' : 'transparent',
                  transition: 'border-color 0.15s, background 0.15s',
                }}>
                  <input
                    type="checkbox"
                    value={c.value}
                    checked={certs.includes(c.value)}
                    onChange={() => toggleCert(c.value)}
                    style={{ accentColor: 'var(--primary)', width: 'auto' }}
                  />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={finish} disabled={saving}>
                {saving ? 'Saving…' : 'Finish Setup'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
