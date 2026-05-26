import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ fontSize: 64, fontWeight: 800, color: 'var(--border)' }}>404</h1>
      <p style={{ color: 'var(--text-muted)' }}>Page not found.</p>
      <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
    </div>
  );
}
