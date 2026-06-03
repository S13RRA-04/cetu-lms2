export default function SessionTimeoutWarning({ secondsLeft, onStayLoggedIn, onLogout }) {
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = mins > 0
    ? `${mins}:${String(secs).padStart(2, '0')}`
    : `${secs}s`;

  return (
    <div className="session-timeout-backdrop">
      <div className="session-timeout-modal">
        <div className="session-timeout-icon">⏱</div>
        <h2 className="session-timeout-title">Session Expiring Soon</h2>
        <p className="session-timeout-body">
          You've been inactive. You'll be logged out in{' '}
          <span className="session-timeout-countdown">{countdown}</span>
          {' '}unless you resume activity.
        </p>
        <div className="session-timeout-actions">
          <button className="btn-submit session-timeout-stay" onClick={onStayLoggedIn}>
            Stay Logged In
          </button>
          <button className="session-timeout-signout" onClick={onLogout}>
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
