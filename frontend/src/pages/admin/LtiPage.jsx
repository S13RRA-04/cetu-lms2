import { useEffect, useState } from 'react';
import { getPlatforms, createPlatform, updatePlatform, deletePlatform } from '../../api/lti.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';

const EMPTY = {
  name: '', client_id: '', platform_url: '',
  auth_endpoint: '', token_endpoint: '', jwks_endpoint: '',
  deployment_ids: '',
};

function PlatformForm({ initial, onSave, onClose }) {
  const [form, setForm]   = useState(initial
    ? { ...initial, deployment_ids: (initial.deployment_ids ?? []).join(', ') }
    : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        deployment_ids: form.deployment_ids.split(',').map((s) => s.trim()).filter(Boolean),
      };
      if (initial) await updatePlatform(initial.id, payload);
      else         await createPlatform(payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Failed to save platform.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, placeholder = '') => (
    <div className="form-group">
      <label>{label}</label>
      <input value={form[key]} onChange={set(key)} placeholder={placeholder} required />
    </div>
  );

  return (
    <form onSubmit={submit}>
      {error && <div className="alert alert-error">{error}</div>}
      {field('name', 'Platform Name *', 'e.g. Canvas LMS')}
      {field('client_id', 'Client ID *')}
      {field('platform_url', 'Platform URL *', 'https://canvas.example.edu')}
      {field('auth_endpoint', 'Auth Endpoint *', 'https://canvas.example.edu/api/lti/authorize_redirect')}
      {field('token_endpoint', 'Token Endpoint *', 'https://canvas.example.edu/login/oauth2/token')}
      {field('jwks_endpoint', 'JWKS Endpoint *', 'https://canvas.example.edu/api/lti/security/jwks')}
      <div className="form-group">
        <label>Deployment IDs</label>
        <input value={form.deployment_ids} onChange={set('deployment_ids')} placeholder="id1, id2, id3" />
        <span className="form-hint">Comma-separated deployment IDs</span>
      </div>
      <div className="flex-end" style={{ marginTop: 16, gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function LtiPage() {
  const [platforms, setPlatforms] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const load = () => {
    setLoading(true);
    getPlatforms()
      .then((data) => setPlatforms(data.data ?? data.platforms ?? data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    await deletePlatform(delTarget.id);
    setDelTarget(null);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>LTI Platforms</h1>
          <p>Manage LTI 1.3 tool provider registrations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Register Platform</button>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : platforms.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
            <h3 style={{ marginTop: 8 }}>No platforms registered</h3>
            <p>Register an LTI 1.3 platform to enable tool launches.</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal('new')}>Register Platform</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Client ID</th><th>Platform URL</th><th>Deployments</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {platforms.map((p) => (
                  <tr key={p.id}>
                    <td className="fw-600">{p.name}</td>
                    <td className="text-sm text-muted">{p.client_id}</td>
                    <td className="text-sm">{p.platform_url}</td>
                    <td className="text-xs text-muted">{(p.deployment_ids ?? []).length} deployment(s)</td>
                    <td>
                      {p.is_active
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-gray">Inactive</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setModal(p)}>Edit</button>
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => setDelTarget(p)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h2>LTI Configuration Info</h2></div>
        <div className="card-body">
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>Provide these values to your LTI platform when registering this tool:</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              ['Launch URL',      `${window.location.origin}/lti`],
              ['Login URL',       `${window.location.origin}/lti/login`],
              ['Redirect URI',    `${window.location.origin}/lti`],
              ['JWKS URL',        `${window.location.origin}/lti/keys`],
              ['Deep Link URL',   `${window.location.origin}/lti/deeplink`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="text-sm fw-600" style={{ minWidth: 120 }}>{label}</span>
                <code style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: 4, fontSize: 12, flex: 1, wordBreak: 'break-all' }}>{val}</code>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'Register LTI Platform' : 'Edit Platform'} onClose={() => setModal(null)}>
          <PlatformForm
            initial={modal !== 'new' ? modal : null}
            onSave={() => { setModal(null); load(); }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete Platform"
          message={`Delete platform "${delTarget.name}"? All LTI sessions for this platform will stop working.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
