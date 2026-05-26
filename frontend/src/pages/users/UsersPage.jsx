import { useEffect, useState, useCallback } from 'react';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users.js';
import useAuthStore from '../../store/authStore.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import Pagination from '../../components/common/Pagination.jsx';

const ROLES = ['admin', 'instructor', 'student'];

function UserForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState({
    email:      initial?.email      ?? '',
    username:   initial?.username   ?? '',
    first_name: initial?.first_name ?? '',
    last_name:  initial?.last_name  ?? '',
    role:       initial?.role       ?? 'student',
    is_active:  initial?.is_active  ?? true,
    password:   '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const isEdit = Boolean(initial);

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const payload = { first_name: form.first_name, last_name: form.last_name, role: form.role, is_active: form.is_active };
        await updateUser(initial.id, payload);
      } else {
        await createUser(form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div className="alert alert-error">{error}</div>}
      {!isEdit && (
        <>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label>Username *</label>
            <input value={form.username} onChange={set('username')} required minLength={3} maxLength={100} />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input type="password" value={form.password} onChange={set('password')} required minLength={8} />
          </div>
        </>
      )}
      <div className="grid-2">
        <div className="form-group">
          <label>First Name *</label>
          <input value={form.first_name} onChange={set('first_name')} required />
        </div>
        <div className="form-group">
          <label>Last Name *</label>
          <input value={form.last_name} onChange={set('last_name')} required />
        </div>
      </div>
      <div className="form-group">
        <label>Role</label>
        <select value={form.role} onChange={set('role')}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {isEdit && (
        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="active" checked={form.is_active} onChange={set('is_active')} style={{ width: 'auto' }} />
          <label htmlFor="active" style={{ marginBottom: 0 }}>Active</label>
        </div>
      )}
      <div className="flex-end" style={{ marginTop: 16, gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const [users,      setUsers]      = useState([]);
  const [meta,       setMeta]       = useState({});
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeTab,  setActiveTab]  = useState('all'); // 'all' | 'pending'
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null);
  const [delTarget,  setDelTarget]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search: search || undefined, role: roleFilter || undefined, page, limit: 15 };
    if (activeTab === 'pending') params.is_active = 'false';
    getUsers(params)
      .then((data) => { setUsers(data.data ?? data.users ?? []); setMeta(data.meta ?? {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, roleFilter, activeTab, page]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    await deleteUser(delTarget.id);
    setDelTarget(null);
    load();
  };

  const roleBadge = (role) => {
    const cls = role === 'superadmin' || role === 'admin' ? 'badge-red' : role === 'instructor' ? 'badge-blue' : 'badge-gray';
    return <span className={`badge ${cls}`}>{role}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p>{meta.total ?? ''} total users</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ New User</button>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab${activeTab === 'all' ? ' active' : ''}`} onClick={() => { setActiveTab('all'); setPage(1); }}>All Users</button>
        <button className={`tab${activeTab === 'pending' ? ' active' : ''}`} onClick={() => { setActiveTab('pending'); setPage(1); }}>
          Pending Approval
        </button>
      </div>

      <div className="toolbar">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <div className="search-input" style={{ flex: 1 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={{ width: 140 }}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <LoadingSpinner /> : users.length === 0 ? (
          <div className="empty-state"><p>No users found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="fw-600">{u.first_name} {u.last_name}</td>
                    <td className="text-sm">{u.email}</td>
                    <td className="text-sm text-muted">{u.username}</td>
                    <td>{roleBadge(u.role)}</td>
                    <td>
                      {u.is_active
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-gray">Inactive</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {!u.is_active && (
                          <button className="btn btn-primary btn-xs" onClick={async () => {
                            await updateUser(u.id, { is_active: true });
                            load();
                          }}>Approve</button>
                        )}
                        <button className="btn btn-ghost btn-xs" onClick={() => setModal(u)}>Edit</button>
                        {u.id !== me?.id && (
                          <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => setDelTarget(u)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="card-footer">
          <Pagination page={page} totalPages={meta.totalPages ?? 1} onChange={setPage} />
        </div>
      </div>

      {modal && (
        <Modal title={modal === 'new' ? 'New User' : 'Edit User'} onClose={() => setModal(null)}>
          <UserForm
            initial={modal !== 'new' ? modal : null}
            onSave={() => { setModal(null); load(); }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete User"
          message={`Delete user "${delTarget.first_name} ${delTarget.last_name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
