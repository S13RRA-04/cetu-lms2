import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getCourse, deleteModule, createModule, updateModule,
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getGrades, upsertGrade,
  getEnrollments, enrollUser,
  getContentItems, createContentItem, updateContentItem, deleteContentItem,
  getSubmissions, getMySubmission, submitAssignment,
} from '../../api/courses.js';
import { listCohorts, createCohort, updateCohort, deleteCohort, addMember, removeMember } from '../../api/cohorts.js';
import { getUsers } from '../../api/users.js';
import useAuthStore from '../../store/authStore.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';

const CONTENT_TYPES = ['video', 'document', 'quiz', 'assignment', 'lti_tool', 'text'];

function StatusBadge({ status }) {
  const cls = status === 'published' ? 'badge-green' : status === 'archived' ? 'badge-gray' : 'badge-blue';
  return <span className={`badge ${cls}`}>{status}</span>;
}

// ── Content Item Form ─────────────────────────────────────────────────────────
function ContentItemForm({ courseId, moduleId, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    title:       initial?.title       ?? '',
    type:        initial?.type        ?? 'document',
    content_url: initial?.content_url ?? '',
    order_index: initial?.order_index ?? 0,
    is_published: initial?.is_published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, order_index: Number(form.order_index) };
      if (initial) await updateContentItem(courseId, moduleId, initial.id, payload);
      else         await createContentItem(courseId, moduleId, payload);
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-group">
        <label>Title *</label>
        <input value={form.title} onChange={set('title')} required />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label>Type *</label>
          <select value={form.type} onChange={set('type')}>
            {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Order</label>
          <input type="number" value={form.order_index} onChange={set('order_index')} min={0} />
        </div>
      </div>
      <div className="form-group">
        <label>URL</label>
        <input value={form.content_url} onChange={set('content_url')} placeholder="https://…" />
      </div>
      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" id="cpub" checked={form.is_published} onChange={set('is_published')} style={{ width: 'auto' }} />
        <label htmlFor="cpub" style={{ marginBottom: 0 }}>Published</label>
      </div>
      <div className="flex-end" style={{ marginTop: 16, gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

// ── Module Form ───────────────────────────────────────────────────────────────
function ModuleForm({ courseId, initial, onSave, onClose }) {
  const [title,       setTitle]       = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [published,   setPublished]   = useState(initial?.is_published ?? true);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { title, description, is_published: published };
      if (initial) await updateModule(courseId, initial.id, payload);
      else         await createModule(courseId, payload);
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-group"><label>Title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
      <div className="form-group"><label>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" id="mpub" checked={published} onChange={(e) => setPublished(e.target.checked)} style={{ width: 'auto' }} />
        <label htmlFor="mpub" style={{ marginBottom: 0 }}>Published</label>
      </div>
      <div className="flex-end" style={{ marginTop: 16, gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

// ── Assignment Form ───────────────────────────────────────────────────────────
function AssignmentForm({ courseId, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    title: initial?.title ?? '', description: initial?.description ?? '',
    max_score: initial?.max_score ?? 100,
    due_date: initial?.due_date?.slice(0, 16) ?? '',
    is_published: initial?.is_published ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, max_score: Number(form.max_score), due_date: form.due_date || undefined };
      if (initial) await updateAssignment(courseId, initial.id, payload);
      else         await createAssignment(courseId, payload);
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-group"><label>Title *</label><input value={form.title} onChange={set('title')} required /></div>
      <div className="form-group"><label>Description</label><textarea value={form.description} onChange={set('description')} rows={3} /></div>
      <div className="grid-2">
        <div className="form-group"><label>Max Score</label><input type="number" value={form.max_score} onChange={set('max_score')} min={0} required /></div>
        <div className="form-group"><label>Due Date</label><input type="datetime-local" value={form.due_date} onChange={set('due_date')} /></div>
      </div>
      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" id="apub" checked={form.is_published} onChange={set('is_published')} style={{ width: 'auto' }} />
        <label htmlFor="apub" style={{ marginBottom: 0 }}>Published</label>
      </div>
      <div className="flex-end" style={{ marginTop: 16, gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

// ── Grades Modal ──────────────────────────────────────────────────────────────
function GradesModal({ courseId, assignment, onClose }) {
  const [grades, setGrades]   = useState([]);
  const [subs, setSubs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});

  useEffect(() => {
    Promise.all([getGrades(courseId, assignment.id), getSubmissions(courseId, assignment.id)])
      .then(([g, s]) => { setGrades(g); setSubs(s); })
      .finally(() => setLoading(false));
  }, [courseId, assignment.id]);

  const handleGrade = async (userId, score, feedback) => {
    await upsertGrade(courseId, assignment.id, userId, { score: Number(score), feedback });
    const [updated] = await Promise.all([getGrades(courseId, assignment.id)]);
    setGrades(updated);
    setEditing((e) => { const n = { ...e }; delete n[userId]; return n; });
  };

  const subMap = Object.fromEntries(subs.map((s) => [s.user_id, s]));

  return (
    <Modal title={`Grades — ${assignment.title}`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : (
        <>
          {subs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p className="text-sm fw-600" style={{ marginBottom: 8 }}>Submissions ({subs.length})</p>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th><th>Submitted</th><th>Status</th><th>Content</th></tr></thead>
                  <tbody>
                    {subs.map((s) => (
                      <tr key={s.id}>
                        <td>{s.student?.first_name} {s.student?.last_name}</td>
                        <td className="text-xs text-muted">{new Date(s.submitted_at).toLocaleString()}</td>
                        <td><span className="badge badge-blue">{s.status}</span></td>
                        <td className="text-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.content || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <hr className="divider" />
            </div>
          )}
          <p className="text-sm fw-600" style={{ marginBottom: 8 }}>Grades</p>
          {grades.length === 0 ? <p className="text-muted text-sm">No grades yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>Score / {assignment.max_score}</th><th>Feedback</th><th></th></tr></thead>
                <tbody>
                  {grades.map((g) => (
                    <tr key={g.user_id ?? g.id}>
                      <td>{g.student?.first_name} {g.student?.last_name}</td>
                      <td>
                        {editing[g.user_id]
                          ? <input type="number" defaultValue={g.score} id={`s-${g.user_id}`} style={{ width: 70 }} min={0} max={assignment.max_score} />
                          : (g.score ?? '—')}
                      </td>
                      <td>
                        {editing[g.user_id]
                          ? <input defaultValue={g.feedback} id={`f-${g.user_id}`} style={{ width: 140 }} />
                          : (g.feedback ?? '—')}
                      </td>
                      <td>
                        {editing[g.user_id] ? (
                          <button className="btn btn-primary btn-xs" onClick={() => handleGrade(
                            g.user_id,
                            document.getElementById(`s-${g.user_id}`).value,
                            document.getElementById(`f-${g.user_id}`).value,
                          )}>Save</button>
                        ) : (
                          <button className="btn btn-ghost btn-xs" onClick={() => setEditing((e) => ({ ...e, [g.user_id]: true }))}>Edit</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

// ── Submission Modal (student) ────────────────────────────────────────────────
function SubmitModal({ courseId, assignment, onClose }) {
  const [existing, setExisting] = useState(null);
  const [content,  setContent]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getMySubmission(courseId, assignment.id)
      .then((s) => { if (s) { setExisting(s); setContent(s.content ?? ''); } })
      .finally(() => setLoading(false));
  }, [courseId, assignment.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await submitAssignment(courseId, assignment.id, content);
      setDone(true);
    } finally { setSaving(false); }
  };

  return (
    <Modal title={assignment.title} onClose={onClose}
      footer={!done && !loading && <><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button form="sub-form" type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Submitting…' : existing ? 'Resubmit' : 'Submit'}</button></>}
    >
      {loading ? <LoadingSpinner /> : done ? (
        <div className="alert alert-success">Assignment submitted successfully!</div>
      ) : (
        <>
          {assignment.description && <p className="text-sm" style={{ marginBottom: 12 }}>{assignment.description}</p>}
          {assignment.due_date && (
            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>Due: {new Date(assignment.due_date).toLocaleString()}</p>
          )}
          {existing && <div className="alert alert-info" style={{ marginBottom: 12 }}>You have an existing submission. Resubmitting will replace it.</div>}
          <form id="sub-form" onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Your answer</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="Type your response here…" required />
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

// ── Enrollments Tab ───────────────────────────────────────────────────────────
function EnrollmentsTab({ courseId }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEnrollments(courseId)
      .then((data) => setEnrollments(data.data ?? data.enrollments ?? data ?? []))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) return <LoadingSpinner />;
  if (enrollments.length === 0) return <div className="empty-state"><p>No enrollments yet.</p></div>;

  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Enrolled</th></tr></thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.id}>
              <td>{e.user?.first_name ?? e.User?.first_name} {e.user?.last_name ?? e.User?.last_name}</td>
              <td>{e.user?.email ?? e.User?.email}</td>
              <td><span className="badge badge-blue">{e.role}</span></td>
              <td><StatusBadge status={e.status} /></td>
              <td className="text-xs text-muted">{new Date(e.enrolled_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Module Block with content items ──────────────────────────────────────────
function ModuleBlock({ courseId, mod, canManage, onEdit, onDelete }) {
  const [items,    setItems]    = useState(mod.contentItems ?? []);
  const [open,     setOpen]     = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delItem,  setDelItem]  = useState(null);

  const reload = useCallback(() => {
    getContentItems(courseId, mod.id).then(setItems);
  }, [courseId, mod.id]);

  const typeIcon = (type) => {
    const icons = { video: '▶', document: '📄', quiz: '❓', assignment: '📝', lti_tool: '🔗', text: '📃' };
    return icons[type] ?? '•';
  };

  return (
    <div className="module-block">
      <div className="module-block-header" onClick={() => setOpen((o) => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ opacity: .5, fontSize: 12 }}>{open ? '▼' : '▶'}</span>
          {mod.order_index}. {mod.title}
          {!mod.is_published && <span className="badge badge-gray" style={{ marginLeft: 4 }}>Draft</span>}
          <span className="text-xs text-muted">({items.length} item{items.length !== 1 ? 's' : ''})</span>
        </span>
        {canManage && (
          <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn btn-ghost btn-xs" onClick={() => setAddModal(true)}>+ Content</button>
            <button className="btn btn-ghost btn-xs" onClick={onEdit}>Edit</button>
            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={onDelete}>Delete</button>
          </div>
        )}
      </div>

      {open && (
        <div className="module-block-body">
          {mod.description && <p className="text-sm text-muted" style={{ marginBottom: 8 }}>{mod.description}</p>}
          {items.length === 0 ? (
            <p className="text-xs text-muted" style={{ padding: '8px 0' }}>No content yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 16 }}>{typeIcon(item.type)}</span>
                <span className="text-sm" style={{ flex: 1 }}>{item.title}</span>
                {!item.is_published && <span className="badge badge-gray" style={{ fontSize: 10 }}>Draft</span>}
                {item.content_url && (
                  <a href={item.content_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs">Open ↗</a>
                )}
                {canManage && (
                  <>
                    <button className="btn btn-ghost btn-xs" onClick={() => setEditItem(item)}>Edit</button>
                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => setDelItem(item)}>✕</button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {addModal && (
        <Modal title="Add Content Item" onClose={() => setAddModal(false)}>
          <ContentItemForm courseId={courseId} moduleId={mod.id} onSave={() => { setAddModal(false); reload(); }} onClose={() => setAddModal(false)} />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit Content Item" onClose={() => setEditItem(null)}>
          <ContentItemForm courseId={courseId} moduleId={mod.id} initial={editItem} onSave={() => { setEditItem(null); reload(); }} onClose={() => setEditItem(null)} />
        </Modal>
      )}
      {delItem && (
        <ConfirmDialog
          title="Delete Content Item"
          message={`Delete "${delItem.title}"?`}
          onConfirm={async () => { await deleteContentItem(courseId, mod.id, delItem.id); setDelItem(null); reload(); }}
          onCancel={() => setDelItem(null)}
        />
      )}
    </div>
  );
}

// ── Cohort Form ───────────────────────────────────────────────────────────────
function CohortForm({ courseId, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    name:       initial?.name       ?? '',
    start_date: initial?.start_date ?? '',
    end_date:   initial?.end_date   ?? '',
    is_active:  initial?.is_active  ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, start_date: form.start_date || null, end_date: form.end_date || null };
      if (initial) await updateCohort(courseId, initial.id, payload);
      else         await createCohort(courseId, payload);
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <div className="form-group"><label>Name *</label><input value={form.name} onChange={set('name')} required /></div>
      <div className="grid-2">
        <div className="form-group"><label>Start Date</label><input type="date" value={form.start_date} onChange={set('start_date')} /></div>
        <div className="form-group"><label>End Date</label><input type="date" value={form.end_date} onChange={set('end_date')} /></div>
      </div>
      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" id="cact" checked={form.is_active} onChange={set('is_active')} style={{ width: 'auto' }} />
        <label htmlFor="cact" style={{ marginBottom: 0 }}>Active</label>
      </div>
      <div className="flex-end" style={{ marginTop: 16, gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({ courseId, cohort, onSave, onClose }) {
  const [query,   setQuery]   = useState('');
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding,  setAdding]  = useState(null);

  const memberIds = new Set((cohort.members ?? []).map((m) => m.id));

  const search = useCallback(async (q) => {
    if (!q.trim()) { setUsers([]); return; }
    setLoading(true);
    try {
      const res = await getUsers({ search: q, role: 'student', is_active: true, limit: 20 });
      setUsers(res.data ?? res.users ?? res ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const handleAdd = async (userId) => {
    setAdding(userId);
    try { await addMember(courseId, cohort.id, userId); onSave(); }
    finally { setAdding(null); }
  };

  return (
    <Modal title={`Add Member — ${cohort.name}`} onClose={onClose}>
      <div className="form-group">
        <input
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      {loading && <LoadingSpinner />}
      {!loading && users.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.first_name} {u.last_name}</td>
                  <td className="text-sm text-muted">{u.email}</td>
                  <td>
                    {memberIds.has(u.id)
                      ? <span className="badge badge-green">Enrolled</span>
                      : <button className="btn btn-primary btn-xs" disabled={adding === u.id} onClick={() => handleAdd(u.id)}>{adding === u.id ? '…' : 'Add'}</button>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && query.trim() && users.length === 0 && (
        <p className="text-muted text-sm">No matching students found.</p>
      )}
    </Modal>
  );
}

// ── Cohorts Tab ───────────────────────────────────────────────────────────────
function CohortsTab({ courseId }) {
  const [cohorts,      setCohorts]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [cohortModal,  setCohortModal]  = useState(null);
  const [delCohort,    setDelCohort]    = useState(null);
  const [addModal,     setAddModal]     = useState(null);
  const [removingId,   setRemovingId]   = useState(null);

  const load = useCallback(() =>
    listCohorts(courseId).then((data) => {
      setCohorts(data);
      setSelected((prev) => data.find((c) => c.id === prev?.id) ?? data[0] ?? null);
    }).finally(() => setLoading(false)),
  [courseId]);

  useEffect(() => { load(); }, [load]);

  const handleRemoveMember = async (userId) => {
    setRemovingId(userId);
    try { await removeMember(courseId, selected.id, userId); load(); }
    finally { setRemovingId(null); }
  };

  const handleDeleteCohort = async () => {
    await deleteCohort(courseId, delCohort.id);
    setDelCohort(null);
    setSelected(null);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* ── Left: cohort list ── */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div className="flex-end" style={{ marginBottom: 8 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setCohortModal('new')}>+ New Cohort</button>
        </div>
        {cohorts.length === 0
          ? <p className="text-muted text-sm">No cohorts yet.</p>
          : cohorts.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{
                padding: '10px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                background: selected?.id === c.id ? 'var(--primary)' : 'var(--surface)',
                color:      selected?.id === c.id ? '#fff' : 'inherit',
                border:     '1px solid var(--border)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 12, opacity: .75 }}>
                {c.members?.length ?? 0} member{(c.members?.length ?? 0) !== 1 ? 's' : ''}
                {!c.is_active && <span style={{ marginLeft: 6, opacity: .7 }}>· inactive</span>}
              </div>
            </div>
          ))
        }
      </div>

      {/* ── Right: cohort detail ── */}
      <div style={{ flex: 1 }}>
        {!selected ? (
          <div className="empty-state"><p>Select a cohort to view members.</p></div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>{selected.name}</h3>
                  {(selected.start_date || selected.end_date) && (
                    <p className="text-sm text-muted">
                      {selected.start_date ? new Date(selected.start_date).toLocaleDateString() : '?'}
                      {' – '}
                      {selected.end_date   ? new Date(selected.end_date).toLocaleDateString()   : 'ongoing'}
                    </p>
                  )}
                  {!selected.is_active && <span className="badge badge-gray" style={{ marginTop: 4 }}>Inactive</span>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setCohortModal(selected)}>Edit</button>
                  <button className="btn btn-primary btn-sm"   onClick={() => setAddModal(selected)}>+ Add Member</button>
                  <button className="btn btn-ghost btn-sm"     onClick={() => setDelCohort(selected)} style={{ color: 'var(--danger)' }}>Delete</button>
                </div>
              </div>

              {(selected.members ?? []).length === 0 ? (
                <p className="text-muted text-sm">No members yet. Click "+ Add Member" to enroll students.</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Enrolled</th><th></th></tr></thead>
                    <tbody>
                      {selected.members.map((m) => (
                        <tr key={m.id}>
                          <td className="fw-600">{m.first_name} {m.last_name}</td>
                          <td className="text-sm text-muted">{m.email}</td>
                          <td><span className="badge badge-blue">{m.Enrollment?.status ?? '—'}</span></td>
                          <td className="text-xs text-muted">
                            {m.Enrollment?.enrolled_at ? new Date(m.Enrollment.enrolled_at).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <button
                              className="btn btn-ghost btn-xs"
                              style={{ color: 'var(--danger)' }}
                              disabled={removingId === m.id}
                              onClick={() => handleRemoveMember(m.id)}
                            >
                              {removingId === m.id ? '…' : 'Remove'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {cohortModal && (
        <Modal title={cohortModal === 'new' ? 'New Cohort' : 'Edit Cohort'} onClose={() => setCohortModal(null)}>
          <CohortForm
            courseId={courseId}
            initial={cohortModal !== 'new' ? cohortModal : null}
            onSave={() => { setCohortModal(null); load(); }}
            onClose={() => setCohortModal(null)}
          />
        </Modal>
      )}
      {addModal && (
        <AddMemberModal
          courseId={courseId}
          cohort={addModal}
          onSave={() => { setAddModal(null); load(); }}
          onClose={() => setAddModal(null)}
        />
      )}
      {delCohort && (
        <ConfirmDialog
          title="Delete Cohort"
          message={`Delete cohort "${delCohort.name}"? All members will be unenrolled from this cohort.`}
          onConfirm={handleDeleteCohort}
          onCancel={() => setDelCohort(null)}
        />
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const { id }    = useParams();
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const canManage = user && ['admin', 'superadmin', 'instructor'].includes(user.role);
  const isStudent = user?.role === 'student';

  const [course,      setCourse]      = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('modules');
  const [enrolled,    setEnrolled]    = useState(null); // null=unknown, false=not enrolled, obj=enrollment
  const [enrolling,   setEnrolling]   = useState(false);

  const [moduleModal, setModuleModal] = useState(null);
  const [delModule,   setDelModule]   = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [delAssign,   setDelAssign]   = useState(null);
  const [gradesModal, setGradesModal] = useState(null);
  const [submitModal, setSubmitModal] = useState(null);

  const loadCourse      = useCallback(() => getCourse(id).then(setCourse).catch(() => navigate('/courses')), [id]);
  const loadAssignments = useCallback(() => getAssignments(id).then((d) => setAssignments(d.data ?? d.assignments ?? [])), [id]);

  useEffect(() => {
    Promise.all([getCourse(id), getAssignments(id)])
      .then(([c, a]) => { setCourse(c); setAssignments(a.data ?? a.assignments ?? []); })
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false));
  }, [id]);

  // Check self-enrollment status for students
  useEffect(() => {
    if (!isStudent || !course) return;
    getEnrollments(id).then((data) => {
      const list = data.data ?? data.enrollments ?? data ?? [];
      const mine = list.find((e) => e.user_id === user.id);
      setEnrolled(mine ?? false);
    }).catch(() => setEnrolled(false));
  }, [isStudent, course, id, user?.id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try { const e = await enrollUser(id, {}); setEnrolled(e); }
    catch (_) {}
    finally { setEnrolling(false); }
  };

  if (loading) return <LoadingSpinner />;
  if (!course)  return null;

  const modules = course.modules ?? [];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="flex-center gap-8" style={{ marginBottom: 4 }}>
            <Link to="/courses" className="text-muted text-sm">Courses</Link>
            <span className="text-muted text-sm">/</span>
            <span className="text-sm">{course.title}</span>
          </div>
          <h1>{course.title}</h1>
          <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {course.course_code} · <StatusBadge status={course.status} />
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isStudent && enrolled === false && (
            <button className="btn btn-primary" onClick={handleEnroll} disabled={enrolling}>
              {enrolling ? 'Enrolling…' : 'Enroll in Course'}
            </button>
          )}
          {isStudent && enrolled && <span className="badge badge-green" style={{ alignSelf: 'center' }}>Enrolled</span>}
          {canManage && <Link to={`/courses/${id}/edit`} className="btn btn-secondary">Edit Course</Link>}
        </div>
      </div>

      {(course.description || course.instructor) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            {course.description && <p>{course.description}</p>}
            {course.instructor && (
              <p className="text-sm text-muted mt-8">Instructor: {course.instructor.first_name} {course.instructor.last_name}</p>
            )}
            {course.start_date && (
              <p className="text-sm text-muted mt-4">
                {new Date(course.start_date).toLocaleDateString()} – {course.end_date ? new Date(course.end_date).toLocaleDateString() : 'ongoing'}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="tabs">
        {['modules', 'assignments', ...(canManage ? ['cohorts', 'enrollments'] : [])].map((t) => (
          <button key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Modules ── */}
      {tab === 'modules' && (
        <div>
          {canManage && (
            <div className="flex-end" style={{ marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setModuleModal('new')}>+ Add Module</button>
            </div>
          )}
          {modules.length === 0
            ? <div className="empty-state"><p>No modules yet.</p></div>
            : modules.map((mod) => (
              <ModuleBlock
                key={mod.id}
                courseId={id}
                mod={mod}
                canManage={canManage}
                onEdit={() => setModuleModal(mod)}
                onDelete={() => setDelModule(mod)}
              />
            ))
          }
        </div>
      )}

      {/* ── Assignments ── */}
      {tab === 'assignments' && (
        <div>
          {canManage && (
            <div className="flex-end" style={{ marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => setAssignModal('new')}>+ Add Assignment</button>
            </div>
          )}
          {assignments.length === 0
            ? <div className="empty-state"><p>No assignments yet.</p></div>
            : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th><th>Max Score</th><th>Due Date</th><th>Status</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.id}>
                          <td className="fw-600">{a.title}</td>
                          <td>{a.max_score}</td>
                          <td className="text-sm text-muted">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</td>
                          <td>{a.is_published ? <span className="badge badge-green">Published</span> : <span className="badge badge-gray">Draft</span>}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {isStudent && a.is_published && (
                                <button className="btn btn-primary btn-xs" onClick={() => setSubmitModal(a)}>Submit</button>
                              )}
                              {canManage && (
                                <>
                                  <button className="btn btn-ghost btn-xs" onClick={() => setGradesModal(a)}>Grades</button>
                                  <button className="btn btn-ghost btn-xs" onClick={() => setAssignModal(a)}>Edit</button>
                                  <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => setDelAssign(a)}>Delete</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ── Cohorts ── */}
      {tab === 'cohorts' && canManage && <CohortsTab courseId={id} />}

      {/* ── Enrollments ── */}
      {tab === 'enrollments' && canManage && (
        <div className="card"><EnrollmentsTab courseId={id} /></div>
      )}

      {/* ── Modals ── */}
      {moduleModal && (
        <Modal title={moduleModal === 'new' ? 'Add Module' : 'Edit Module'} onClose={() => setModuleModal(null)}>
          <ModuleForm courseId={id} initial={moduleModal !== 'new' ? moduleModal : null}
            onSave={() => { setModuleModal(null); loadCourse(); }} onClose={() => setModuleModal(null)} />
        </Modal>
      )}
      {delModule && (
        <ConfirmDialog title="Delete Module" message={`Delete module "${delModule.title}"? All content items will also be removed.`}
          onConfirm={async () => { await deleteModule(id, delModule.id); setDelModule(null); loadCourse(); }}
          onCancel={() => setDelModule(null)} />
      )}
      {assignModal && (
        <Modal title={assignModal === 'new' ? 'Add Assignment' : 'Edit Assignment'} onClose={() => setAssignModal(null)}>
          <AssignmentForm courseId={id} initial={assignModal !== 'new' ? assignModal : null}
            onSave={() => { setAssignModal(null); loadAssignments(); }} onClose={() => setAssignModal(null)} />
        </Modal>
      )}
      {delAssign && (
        <ConfirmDialog title="Delete Assignment" message={`Delete assignment "${delAssign.title}"?`}
          onConfirm={async () => { await deleteAssignment(id, delAssign.id); setDelAssign(null); loadAssignments(); }}
          onCancel={() => setDelAssign(null)} />
      )}
      {gradesModal && (
        <GradesModal courseId={id} assignment={gradesModal} onClose={() => setGradesModal(null)} />
      )}
      {submitModal && (
        <SubmitModal courseId={id} assignment={submitModal} onClose={() => setSubmitModal(null)} />
      )}
    </div>
  );
}
