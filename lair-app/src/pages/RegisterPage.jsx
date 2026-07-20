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
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
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
      setError(err.response?.data?.error?.message ?? 'Registration failed. Verify your details and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-pact">LAIR</span>
          <span className="logo-sub">Linux Analysis &amp; Incident Response</span>
        </div>

        {success ? (
          <>
            <div className="alert-box alert-info">
              Request submitted. Your account is pending admin approval —
              you'll be able to authenticate once an administrator activates your credentials.
            </div>
            <Link to="/login" className="btn-auth" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            {error && <div className="alert-box alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>First Name</label>
                <input value={form.first_name} onChange={set('first_name')} required autoFocus />
              </div>
              <div className="field">
                <label>Last Name</label>
                <input value={form.last_name} onChange={set('last_name')} required />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="you@cetu.mil"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label>Username</label>
                <input
                  value={form.username}
                  onChange={set('username')}
                  minLength={3}
                  maxLength={100}
                  placeholder="letters and numbers only"
                  required
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  minLength={8}
                  placeholder="Min. 8 characters"
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={set('confirm')}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="btn-auth" disabled={loading}>
                {loading ? 'Submitting…' : 'Request Account'}
              </button>
            </form>

            <div className="cold-start-notice" style={{ marginTop: 20 }}>
              Already have credentials? <Link to="/login">Sign in</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
