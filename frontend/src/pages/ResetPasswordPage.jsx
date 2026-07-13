import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset } from '../api/auth.js';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'That reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <h1>CETU LMS</h1>
          <p>Set a new password</p>
        </div>

        {!token ? (
          <div>
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              This reset link is missing its token. Please use the link from your email, or request a new one.
            </div>
            <Link to="/forgot-password" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Request a new link
            </Link>
          </div>
        ) : success ? (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <strong>Password reset</strong>
              <p style={{ marginTop: 6, fontSize: 13 }}>
                You've been signed out of all devices for security. Sign back in with your new password.
              </p>
            </div>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                {error}
                {' '}<Link to="/forgot-password">Request a new link</Link>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label htmlFor="confirm">Confirm new password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
