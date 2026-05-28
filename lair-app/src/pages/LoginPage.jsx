import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/lair.js';
import useAuthStore from '../store/authStore.js';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { setUser } = useAuthStore();
  const navigate    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      localStorage.setItem('accessToken', data.accessToken);
      setUser(data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Authentication failed. Check your credentials.');
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

        <div className="cold-start-notice">
          This service suspends after inactivity. The first login following an
          idle period may take up to 60 seconds while the server restarts.
        </div>

        {error && <div className="alert-box alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@cetu.mil"
              required
              autoFocus
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-auth" disabled={loading}>
            {loading ? 'Authenticating…' : 'Authenticate'}
          </button>
        </form>
      </div>
    </div>
  );
}
