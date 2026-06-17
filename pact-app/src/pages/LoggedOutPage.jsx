import { useNavigate } from 'react-router-dom';

export default function LoggedOutPage() {
  const navigate = useNavigate();
  return (
    <div className="auth-root">
      <div className="auth-banner">
        <strong>WARNING</strong> — This system is for <strong>AUTHORIZED USE ONLY</strong>.
        {' '}All activity is monitored and recorded.
        Unauthorized access is prohibited and may be subject to criminal prosecution.
      </div>

      <div className="auth-panel" style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.2em',
          color: 'rgba(148,163,184,0.45)', marginBottom: 28, textTransform: 'uppercase',
        }}>
          SECURE SYSTEM ACCESS · PACT
        </div>

        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.18em',
          color: '#fbbf24', marginBottom: 16, textTransform: 'uppercase',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>SESSION TERMINATED
        </div>

        <h1 style={{
          fontSize: 18, fontWeight: 700, color: '#e2e8f0',
          margin: '0 0 12px', letterSpacing: '.04em',
        }}>
          Operator Session Ended
        </h1>

        <p style={{
          fontSize: 13, color: 'rgba(148,163,184,0.6)',
          lineHeight: 1.65, margin: '0 0 32px',
        }}>
          Your session was terminated due to inactivity.<br />
          Re-authenticate to resume operations.
        </p>

        <button
          className="auth-submit"
          onClick={() => navigate('/login', { replace: true })}
        >
          AUTHENTICATE
        </button>
      </div>

      <div className="auth-class-bar">UNCLASSIFIED // TRAINING ENVIRONMENT</div>
    </div>
  );
}
