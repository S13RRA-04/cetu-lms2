import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { createEnvironment, deleteEnvironment } from '../api/kcr.js';
import Modal from '../components/Modal.jsx';

export default function DashboardPage() {
  const { envs, setEnvs, isAdmin } = useOutletContext();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', course_id: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const env = await createEnvironment({
        name: form.name,
        description: form.description || undefined,
        course_id: form.course_id || undefined,
      });
      setEnvs((prev) => [env, ...prev]);
      setShowCreate(false);
      setForm({ name: '', description: '', course_id: '' });
      navigate(`/env/${env.id}`);
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Failed to create environment.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (e, env) => {
    e.stopPropagation();
    if (!confirm(`Delete environment "${env.name}"? This will remove all venues, rooms and placements.`)) return;
    try {
      await deleteEnvironment(env.id);
      setEnvs((prev) => prev.filter((x) => x.id !== env.id));
    } catch { /* ignore */ }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Environments</div>
          <div className="page-title-mono">KCR Scenario Environments</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + New Environment
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {envs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No environments configured</div>
            <div className="empty-state-sub">
              Create a KCR environment to start mapping venues, rooms, and artifact placements.
            </div>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                + New Environment
              </button>
            )}
          </div>
        ) : (
          <div className="card-grid">
            {envs.map((env) => (
              <div key={env.id} className="env-card" onClick={() => navigate(`/env/${env.id}`)}>
                <div className="env-card-name">{env.name}</div>
                {env.description && <div className="env-card-desc">{env.description}</div>}
                <div className="env-card-meta">
                  <span className={`meta-chip ${env.is_active ? 'active' : 'inactive'}`}>
                    {env.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {env.course_id && <span className="meta-chip course">Linked to Course</span>}
                </div>
                {isAdmin && (
                  <button
                    className="btn btn-danger"
                    style={{ position: 'absolute', top: 12, right: 12, padding: '4px 8px', fontSize: 11 }}
                    onClick={(e) => handleDelete(e, env)}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <Modal title="New KCR Environment" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="modal-field">
              <label>Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. DFIR-LIN-301 — Spring 2026"
                required autoFocus
              />
            </div>
            <div className="modal-field">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief overview of the scenario environment…"
                rows={3}
              />
            </div>
            <div className="modal-field">
              <label>Course ID (optional)</label>
              <input
                value={form.course_id}
                onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
                placeholder="LMS course UUID"
              />
            </div>
            {err && <div className="err-msg" style={{ marginBottom: 12 }}>{err}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
