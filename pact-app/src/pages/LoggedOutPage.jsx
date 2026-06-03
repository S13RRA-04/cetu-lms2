import { useNavigate } from 'react-router-dom';

export default function LoggedOutPage() {
  const navigate = useNavigate();
  return (
    <div className="logged-out-page">
      <div className="logged-out-card">
        <div className="logged-out-icon">🔒</div>
        <h1 className="logged-out-title">Session Ended</h1>
        <p className="logged-out-body">
          You were logged out due to inactivity. Please sign in to continue.
        </p>
        <button className="btn-submit logged-out-btn" onClick={() => navigate('/login', { replace: true })}>
          Sign In Again
        </button>
      </div>
    </div>
  );
}
