import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { login } from '../api/pact.js';
import useAuthStore from '../store/authStore.js';

const CONNECTING = [
  { id: 'ch',  text: 'ESTABLISHING SECURE CHANNEL...' },
  { id: 'enc', text: 'CHANNEL ENCRYPTED · TLS 1.3'    },
  { id: 'vfy', text: 'VERIFYING CREDENTIALS...'        },
];

const SUCCESS = [
  { id: 'idc', text: 'IDENTITY CONFIRMED',          confirm: true },
  { id: 'clr', text: 'CLEARANCE LEVEL: AUTHORIZED', confirm: true },
  { id: 'ldo', text: 'LOADING OPERATIONS CENTER...'               },
];

const ROLE_ABBR = {
  special_agent:                    'S/A',
  intelligence_analyst:             'I/A',
  supervisory_special_agent:        'SS/A',
  supervisory_intelligence_analyst: 'SI/A',
  task_force_officer:               'TFO',
  operational_support_sos:          'OPS',
  operational_support_da:           'OPS',
  cyber_analyst:                    'C/A',
  digital_evidence_lead:            'DEL',
};

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [phase,    setPhase]    = useState('form'); // form | auth | done
  const [lines,    setLines]    = useState([]);
  const [welcome,  setWelcome]  = useState('');
  const startRef = useRef(0);
  const { setUser } = useAuthStore();
  const navigate    = useNavigate();

  const addLine = (id) => setLines(p => [...p, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLines([]);
    setPhase('auth');
    startRef.current = Date.now();

    // Connecting lines start immediately, independent of API
    setTimeout(() => addLine('ch'),  80);
    setTimeout(() => addLine('enc'), 780);
    setTimeout(() => addLine('vfy'), 1600);

    try {
      const data = await login(email, password);

      // Wait until at least 2.2s of sequence has played before showing result
      const elapsed  = Date.now() - startRef.current;
      const waitMore = Math.max(0, 2200 - elapsed);

      setTimeout(() => {
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);

        const abbr = ROLE_ABBR[data.user.professional_role] ?? 'AGENT';
        const name = (data.user.last_name ?? data.user.email ?? '').toUpperCase();
        setWelcome(`WELCOME, ${abbr} ${name}`);

        setTimeout(() => addLine('idc'), 0);
        setTimeout(() => addLine('clr'), 650);
        setTimeout(() => addLine('ldo'), 1250);
        setTimeout(() => setPhase('done'), 1600);
        setTimeout(() => navigate('/'),    2500);
      }, waitMore);

    } catch (err) {
      const elapsed  = Date.now() - startRef.current;
      const waitMore = Math.max(0, 2000 - elapsed);

      setTimeout(() => {
        addLine('fail');
        setTimeout(() => {
          setPhase('form');
          setLines([]);
          setError(
            err.response?.data?.error?.message ??
            'AUTHENTICATION FAILED — VERIFY CREDENTIALS AND RETRY'
          );
        }, 1100);
      }, waitMore);
    }
  };

  const allLines = [
    ...CONNECTING,
    ...SUCCESS,
    { id: 'fail', text: 'ACCESS DENIED — AUTHENTICATION FAILED', fail: true },
  ];

  return (
    <div className="auth-root">

      {/* Government system warning banner */}
      <div className="auth-banner">
        <strong>WARNING</strong> — This system is for <strong>AUTHORIZED USE ONLY</strong>.
        {' '}All activity is monitored and recorded.
        Unauthorized access is prohibited and may be subject to criminal prosecution.
      </div>

      <AnimatePresence mode="wait">

        {phase === 'form' && (
          <motion.div key="form" className="auth-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
            transition={{ duration: 0.35 }}
          >
            {/* System identifier */}
            <div className="auth-ident">
              <div className="auth-ident-badge">SECURE SYSTEM ACCESS</div>
              <div className="auth-wordmark">PACT</div>
              <div className="auth-wordmark-sub">Practical Applications to Cyber Threats</div>
              <div className="auth-wordmark-org">CETU · Cyber Operations Division · TF-BRKR</div>
            </div>

            {error && (
              <div className="auth-err">
                <span className="auth-err-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </span>{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">OPERATOR IDENTIFIER</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="auth-input"
                  placeholder="operator@cetu.mil"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">ACCESS CODE</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="auth-input"
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="auth-submit">
                AUTHENTICATE
              </button>
            </form>

            <p className="auth-notice">
              System may enter standby after periods of inactivity.
              Initial access following standby may require up to 60 seconds.
            </p>
            <p className="auth-notice">
              No credentials? <Link to="/register">Request access</Link>
            </p>
            <p className="auth-notice">
              Forgot your password? <a href="https://lms.cetu.online/forgot-password">Reset it via the LMS</a>
            </p>
          </motion.div>
        )}

        {(phase === 'auth' || phase === 'done') && (
          <motion.div key="seq" className="auth-sequence"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="auth-seq-block">
              {allLines.map(({ id, text, confirm, fail }) => (
                <motion.div
                  key={id}
                  className={`auth-seq-line${confirm ? ' auth-seq-confirm' : ''}${fail ? ' auth-seq-fail' : ''}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={lines.includes(id) ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {!confirm && !fail && <span className="auth-seq-cursor">›</span>}
                  {confirm && <span className="auth-seq-cursor auth-seq-cursor--ok">✓</span>}
                  {fail    && <span className="auth-seq-cursor auth-seq-cursor--fail">✕</span>}
                  {text}
                </motion.div>
              ))}

              {phase === 'done' && (
                <motion.div
                  className="auth-seq-welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.15 }}
                >
                  {welcome}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <div className="auth-class-bar">
        UNCLASSIFIED // TRAINING ENVIRONMENT
      </div>
    </div>
  );
}
