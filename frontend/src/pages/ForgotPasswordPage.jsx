import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api/auth.js';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      // Always show success — the API responds the same way whether or not
      // the email is registered, so the UI must too.
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <h1>CETU LMS</h1>
          <p>Reset your password</p>
        </div>

        {success ? (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <strong>Check your email</strong>
              <p style={{ marginTop: 6, fontSize: 13 }}>
                If {email} is registered, we've sent a link to reset your password. It expires in 30 minutes.
              </p>
            </div>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
              Enter the email address on your account and we'll send you a link to reset your password.
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@cetu.mil"
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
            <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 16 }}>
              <Link to="/login">Back to login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
