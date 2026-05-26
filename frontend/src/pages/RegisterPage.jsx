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
      setError(err.response?.data?.error?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box" style={{ maxWidth: 460 }}>
        <div className="login-logo">
          <h1>CETU LMS</h1>
          <p>Create an account</p>
        </div>

        {success ? (
          <div>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <strong>Registration submitted!</strong>
              <p style={{ marginTop: 6, fontSize: 13 }}>
                Your account is pending admin approval. You'll be able to log in once an administrator activates your account.
              </p>
            </div>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label>First Name *</label>
                  <input value={form.first_name} onChange={set('first_name')} required autoFocus />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input value={form.last_name} onChange={set('last_name')} required />
                </div>
              </div>
              <div className="form-group">
                <label>Email address *</label>
                <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input value={form.username} onChange={set('username')} required minLength={3} maxLength={100} placeholder="letters and numbers only" />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" value={form.password} onChange={set('password')} required minLength={8} placeholder="Min. 8 characters" />
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Confirm Password *</label>
                <input type="password" value={form.confirm} onChange={set('confirm')} required minLength={8} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Submitting…' : 'Request Account'}
              </button>
            </form>
            <p className="text-sm text-muted" style={{ textAlign: 'center', marginTop: 16 }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
