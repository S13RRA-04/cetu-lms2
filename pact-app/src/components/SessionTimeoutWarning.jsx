export default function SessionTimeoutWarning({ secondsLeft, onStayLoggedIn, onLogout }) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`;

  return (
    <div className="session-timeout-backdrop">
      <div className="session-timeout-modal" style={{
        background: 'rgba(7,10,13,0.97)',
        border: '1px solid rgba(251,191,36,0.35)',
        boxShadow: '0 0 40px rgba(251,191,36,0.08), 0 24px 64px rgba(0,0,0,0.8)',
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '.2em',
          color: 'rgba(148,163,184,0.4)', marginBottom: 20, textTransform: 'uppercase',
        }}>
          SYSTEM ALERT
        </div>

        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.15em',
          color: '#fbbf24', marginBottom: 14, textTransform: 'uppercase',
        }}>
          ⚠ INACTIVITY DETECTED
        </div>

        <h2 className="session-timeout-title" style={{ color: '#e2e8f0', fontSize: 16, letterSpacing: '.04em' }}>
          Session Expiring
        </h2>

        <p className="session-timeout-body" style={{ color: 'rgba(148,163,184,0.65)' }}>
          Your operator session will be terminated in{' '}
          <span className="session-timeout-countdown" style={{ color: '#fbbf24' }}>{countdown}</span>
          {' '}due to inactivity.
        </p>

        <div className="session-timeout-actions">
          <button
            className="auth-submit session-timeout-stay"
            style={{ fontFamily: 'var(--mono)', letterSpacing: '.14em' }}
            onClick={onStayLoggedIn}
          >
            RESUME OPERATIONS
          </button>
          <button className="session-timeout-signout" onClick={onLogout}>
            Terminate Session
          </button>
        </div>
      </div>
    </div>
  );
}
