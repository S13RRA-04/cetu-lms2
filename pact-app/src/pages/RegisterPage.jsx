import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api/auth.js';

export default function RegisterPage() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', username: '', password: '', confirm: '',
  });
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('ACCESS CODES DO NOT MATCH'); return; }
    setLoading(true);
    try {
      await register({
        first_name: form.first_name,
        last_name:  form.last_name,
        email:      form.email,
        username:   form.username,
        password:   form.password,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.error?.message?.toUpperCase() ??
        'REQUEST FAILED — VERIFY DETAILS AND RETRY'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">

      <div className="auth-banner">
        <strong>WARNING</strong> — This system is for <strong>AUTHORIZED USE ONLY</strong>.
        {' '}All activity is monitored and recorded.
        Unauthorized access is prohibited and may be subject to criminal prosecution.
      </div>

      <div className="auth-panel">
        <div className="auth-ident">
          <div className="auth-ident-badge">SECURE SYSTEM ACCESS</div>
          <div className="auth-wordmark">PACT</div>
          <div className="auth-wordmark-sub">Practical Applications to Cyber Threats</div>
          <div className="auth-wordmark-org">CETU · Cyber Operations Division · TF-BRKR</div>
        </div>

        {success ? (
          <div className="auth-form">
            <div className="auth-seq-line auth-seq-confirm" style={{ marginBottom: 14 }}>
              <span className="auth-seq-cursor auth-seq-cursor--ok">✓</span>
              REQUEST SUBMITTED
            </div>
            <p className="auth-notice" style={{ marginBottom: 20 }}>
              Your account is pending admin approval. You'll be able to authenticate
              once an administrator activates your credentials.
            </p>
            <Link to="/login" className="auth-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              BACK TO SIGN IN
            </Link>
          </div>
        ) : (
          <>
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
                <label className="auth-label">FIRST NAME</label>
                <input value={form.first_name} onChange={set('first_name')} className="auth-input" required autoFocus />
              </div>
              <div className="auth-field">
                <label className="auth-label">LAST NAME</label>
                <input value={form.last_name} onChange={set('last_name')} className="auth-input" required />
              </div>
              <div className="auth-field">
                <label className="auth-label">OPERATOR IDENTIFIER</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  className="auth-input"
                  placeholder="operator@cetu.mil"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">USERNAME</label>
                <input
                  value={form.username}
                  onChange={set('username')}
                  className="auth-input"
                  minLength={3}
                  maxLength={100}
                  placeholder="letters and numbers only"
                  required
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">ACCESS CODE</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  className="auth-input"
                  minLength={8}
                  placeholder="Min. 8 characters"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">CONFIRM ACCESS CODE</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={set('confirm')}
                  className="auth-input"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'SUBMITTING…' : 'REQUEST ACCOUNT'}
              </button>
            </form>

            <p className="auth-notice">
              Already have credentials? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>

      <div className="auth-class-bar">
        UNCLASSIFIED // TRAINING ENVIRONMENT
      </div>
    </div>
  );
}
