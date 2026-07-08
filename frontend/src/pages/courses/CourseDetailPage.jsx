import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getCourse, deleteModule, createModule, updateModule,
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getGrades, upsertGrade,
  getEnrollments, enrollUser,
  getContentItems, createContentItem, updateContentItem, deleteContentItem,
  getSubmissions, getMySubmission, submitAssignment,
  getProgress, unlockAssignment, lockAssignment,
  getCourseGrades,
} from '../../api/courses.js';
import {
  listCohorts, createCohort, updateCohort, deleteCohort, addMembers, removeMember,
  listSquads, createSquad, deleteSquad, assignToSquad, removeFromSquad,
} from '../../api/cohorts.js';
import { getUsers } from '../../api/users.js';
import { getLaunchUrl } from '../../api/auth.js';
import useAuthStore from '../../store/authStore.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import Modal from '../../components/common/Modal.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';

const CONTENT_TYPES   = ['video', 'document', 'quiz', 'assignment', 'lti_tool', 'text'];
const ASSIGNMENT_TYPES = ['module', 'game', 'assessment', 'survey', 'challenge', 'capstone'];
const TYPE_BADGE = {
  module: 'badge-blue', game: 'badge-green', assessment: 'badge-yellow',
  survey: 'badge-gray', challenge: 'badge-red', capstone: 'badge-yellow',
};

function StatusBadge({ status }) {
  const cls = status === 'published' ? 'badge-green' : status === 'archived' ? 'badge-gray' : 'badge-blue';
  return <span className={`badge ${cls}`}>{status}</span>;
}

// ── Content Item Form ─────────────────────────────────────────────────────────
function ContentItemForm({ courseId, moduleId, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    title:        initial?.title        ?? '',
    type:         initial?.type         ?? 'document',
    content_url:  initial?.content_url  ?? '',
    order_index:  initial?.order_index  ?? 0,
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
const WORKSHOP_TYPES = new Set(['challenge', 'capstone']);

function AssignmentForm({ courseId, initial, onSave, onClose }) {
  const [form, setForm] = useState({
    title:        initial?.title        ?? '',
    description:  initial?.description  ?? '',
    max_score:    initial?.max_score    ?? 100,
    due_date:     initial?.due_date?.slice(0, 16) ?? '',
    is_published: initial?.is_published ?? true,
    type:         initial?.type         ?? 'module',
    grading_mode: initial?.grading_mode ?? 'individual',
    order_index:  initial?.order_index  ?? 0,
  });
  /* Prompts — stored as { kind:'prompt', text } inside the questions JSONB column */
  const [prompts, setPrompts] = useState(
    () => (initial?.questions ?? [])
      .filter((q) => q.kind === 'prompt' && q.text)
      .map((q) => ({ text: q.text }))
  );
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const addPrompt    = () => setPrompts((p) => [...p, { text: '' }]);
  const removePrompt = (i) => setPrompts((p) => p.filter((_, j) => j !== i));
  const setPromptText = (i, text) => setPrompts((p) => p.map((item, j) => j === i ? { text } : item));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      /* Preserve any existing non-prompt questions (quiz banks on capstones, etc.)
         and merge in the prompt objects under the questions column. */
      const nonPromptQuestions = (initial?.questions ?? []).filter((q) => q.kind !== 'prompt');
      const promptQuestions    = WORKSHOP_TYPES.has(form.type)
        ? prompts.filter((p) => p.text.trim()).map((p) => ({ kind: 'prompt', text: p.text.trim() }))
        : [];
      const payload = {
        ...form,
        max_score:   Number(form.max_score),
        order_index: Number(form.order_index),
        due_date:    form.due_date || undefined,
        questions:   [...nonPromptQuestions, ...promptQuestions],
      };
      if (initial) await updateAssignment(courseId, initial.id, payload);
      else         await createAssignment(courseId, payload);
      onSave();
    } finally { setSaving(false); }
  };

  const isWorkshop = WORKSHOP_TYPES.has(form.type);

  return (
    <form onSubmit={submit}>
      <div className="form-group"><label>Title *</label><input value={form.title} onChange={set('title')} required /></div>
      <div className="form-group"><label>Description</label><textarea value={form.description} onChange={set('description')} rows={3} /></div>
      <div className="grid-2">
        <div className="form-group">
          <label>Type</label>
          <select value={form.type} onChange={set('type')}>
            {ASSIGNMENT_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Grading Mode</label>
          <select value={form.grading_mode} onChange={set('grading_mode')}>
            <option value="individual">Individual</option>
            <option value="squad">Squad</option>
          </select>
        </div>
      </div>
      <div className="grid-2">
        <div className="form-group"><label>Max Score</label><input type="number" value={form.max_score} onChange={set('max_score')} min={0} required /></div>
        <div className="form-group"><label>Order</label><input type="number" value={form.order_index} onChange={set('order_index')} min={0} /></div>
      </div>
      <div className="form-group"><label>Due Date</label><input type="datetime-local" value={form.due_date} onChange={set('due_date')} /></div>

      {/* ── Prompts editor — only for challenge / capstone types ── */}
      {isWorkshop && (
        <div className="form-group" style={{ flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ marginBottom: 0 }}>
              Response Prompts
              <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>
                — what students must address in their submission
              </span>
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addPrompt}>+ Add Prompt</button>
          </div>
          {prompts.length === 0 ? (
            <p className="text-xs text-muted" style={{ margin: '4px 0 0' }}>
              No prompts defined. Students will see a single open-ended textarea. Add at least one prompt to structure their response.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {prompts.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, marginTop: 7,
                  }}>{i + 1}</span>
                  <input
                    style={{ flex: 1 }}
                    value={p.text}
                    onChange={(e) => setPromptText(i, e.target.value)}
                    placeholder={`Prompt ${i + 1}…`}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    style={{ color: 'var(--danger)', marginTop: 4, flexShrink: 0 }}
                    onClick={() => removePrompt(i)}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
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

// ── Add Squad Form ────────────────────────────────────────────────────────────
function AddSquadForm({ courseId, cohortId, onSave, onClose }) {
  const [number, setNumber] = useState(1);
  const [name,   setName]   = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createSquad(courseId, cohortId, { number: Number(number), name: name || null });
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit}>
      <div className="grid-2">
        <div className="form-group">
          <label>Number *</label>
          <input type="number" value={number} onChange={(e) => setNumber(e.target.value)} min={1} required />
        </div>
        <div className="form-group">
          <label>Name (optional)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alpha" />
        </div>
      </div>
      <p className="text-xs text-muted" style={{ marginTop: 4 }}>
        Squad number determines investigation target (1→Redstone, 2→Dogwood, 3→CyberDyne, 4→PixelPlay, then cycles).
      </p>
      <div className="flex-end" style={{ marginTop: 16, gap: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Squad'}</button>
      </div>
    </form>
  );
}

// ── Squads Panel ──────────────────────────────────────────────────────────────
const VICTIM_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#8b5cf6' };
const VICTIM_NAMES  = { 1: 'Redstone', 2: 'Dogwood', 3: 'CyberDyne', 4: 'PixelPlay' };

function SquadsPanel({ courseId, cohortId, cohortMembers }) {
  const [squads,   setSquads]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [delSquad, setDelSquad] = useState(null);

  const load = useCallback(() =>
    listSquads(courseId, cohortId).then(setSquads).finally(() => setLoading(false)),
  [courseId, cohortId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner />;

  const assignedIds = new Set(squads.flatMap((s) => (s.students ?? []).map((u) => u.id)));
  const unassigned  = (cohortMembers ?? []).filter((m) => !assignedIds.has(m.id));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="fw-600">Task Force Squads ({squads.length})</span>
        <button className="btn btn-primary btn-sm" onClick={() => setAddModal(true)}>+ Add Squad</button>
      </div>

      {squads.length === 0 ? (
        <p className="text-muted text-sm">No squads yet. Add squads to assign students to investigation targets.</p>
      ) : squads.map((squad) => {
        const victimKey   = ((Number(squad.number) - 1) % 4) + 1;
        const victimColor = VICTIM_COLORS[victimKey];
        const victimName  = VICTIM_NAMES[victimKey];
        return (
          <div key={squad.id} style={{ border: `1px solid ${victimColor}40`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: `${victimColor}0d` }}>
              <span className="fw-600" style={{ fontSize: 14 }}>
                <span style={{ color: victimColor, marginRight: 6 }}>■</span>
                Squad {squad.number}{squad.name ? ` — ${squad.name}` : ''}
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                  {(squad.students ?? []).length} operator{(squad.students ?? []).length !== 1 ? 's' : ''} · {victimName}
                </span>
              </span>
              <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => setDelSquad(squad)}>Delete</button>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {(squad.students ?? []).length === 0 ? (
                <p className="text-xs text-muted">No members assigned.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {squad.students.map((u) => (
                    <div key={u.id} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: '#f8fafc', border: '1px solid var(--border)',
                      borderRadius: 20, padding: '2px 6px 2px 10px', fontSize: 13,
                    }}>
                      {u.first_name} {u.last_name}
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0 2px', lineHeight: 1, fontSize: 14 }}
                        title="Remove from squad"
                        onClick={async () => { await removeFromSquad(courseId, cohortId, squad.id, u.id); load(); }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {unassigned.length > 0 && squads.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="text-xs text-muted fw-600" style={{ marginBottom: 8 }}>
            Unassigned cohort members ({unassigned.length})
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unassigned.map((m) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '4px 10px', fontSize: 13,
              }}>
                <span>{m.first_name} {m.last_name}</span>
                <select
                  style={{ fontSize: 12, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, background: 'white' }}
                  defaultValue=""
                  onChange={async (e) => {
                    if (!e.target.value) return;
                    await assignToSquad(courseId, cohortId, e.target.value, m.id);
                    load();
                  }}
                >
                  <option value="">→ assign</option>
                  {squads.map((s) => <option key={s.id} value={s.id}>Squad {s.number}{s.name ? ` (${s.name})` : ''}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {unassigned.length > 0 && squads.length === 0 && (
        <p className="text-xs text-muted" style={{ marginTop: 8 }}>
          Add squads above to start assigning {unassigned.length} cohort member{unassigned.length !== 1 ? 's' : ''}.
        </p>
      )}

      {addModal && (
        <Modal title="Add Squad" onClose={() => setAddModal(false)}>
          <AddSquadForm
            courseId={courseId}
            cohortId={cohortId}
            onSave={() => { setAddModal(false); load(); }}
            onClose={() => setAddModal(false)}
          />
        </Modal>
      )}
      {delSquad && (
        <ConfirmDialog
          title="Delete Squad"
          message={`Delete Squad ${delSquad.number}${delSquad.name ? ` (${delSquad.name})` : ''}? Members will be unassigned.`}
          onConfirm={async () => { await deleteSquad(courseId, cohortId, delSquad.id); setDelSquad(null); load(); }}
          onCancel={() => setDelSquad(null)}
        />
      )}
    </div>
  );
}

// ── Grades Modal ──────────────────────────────────────────────────────────────
function GradesModal({ courseId, assignment, onClose }) {
  const [grades, setGrades]   = useState([]);
  const [subs,   setSubs]     = useState([]);
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

  return (
    <Modal title={`Grades — ${assignment.title}`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : (
        <>
          {assignment.grading_mode === 'squad' && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              Squad-graded assignment. Grading one member automatically applies to all squad members.
            </div>
          )}
          {subs.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p className="text-sm fw-600" style={{ marginBottom: 8 }}>Submissions ({subs.length})</p>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Student</th>{assignment.grading_mode === 'squad' && <th>Squad</th>}<th>Submitted</th><th>Status</th></tr></thead>
                  <tbody>
                    {subs.map((s) => (
                      <tr key={s.id}>
                        <td>{s.student?.first_name} {s.student?.last_name}</td>
                        {assignment.grading_mode === 'squad' && <td>{s.squad ? `Squad ${s.squad.number}` : '—'}</td>}
                        <td className="text-xs text-muted">{new Date(s.submitted_at).toLocaleString()}</td>
                        <td><span className="badge badge-blue">{s.status}</span></td>
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

// ── Submit Modal (student) ────────────────────────────────────────────────────
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
    <Modal
      title={assignment.title}
      onClose={onClose}
      footer={!done && !loading && (
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button form="sub-form" type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Submitting…' : existing ? 'Resubmit' : 'Submit'}
          </button>
        </>
      )}
    >
      {loading ? <LoadingSpinner /> : done ? (
        <div className="alert alert-success">Assignment submitted successfully!</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span className={`badge ${TYPE_BADGE[assignment.type] ?? 'badge-blue'}`}>{assignment.type}</span>
            {assignment.grading_mode === 'squad' && (
              <span className="badge badge-yellow">Squad graded</span>
            )}
          </div>
          {assignment.grading_mode === 'squad' && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              This is a squad tasking — your submission will be graded for your entire squad.
            </div>
          )}
          {assignment.description && <p className="text-sm" style={{ marginBottom: 12 }}>{assignment.description}</p>}
          {assignment.due_date && (
            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>Due: {new Date(assignment.due_date).toLocaleString()}</p>
          )}
          {existing && (
            <div className="alert alert-info" style={{ marginBottom: 12 }}>
              You have an existing submission. Resubmitting will replace it.
              {existing.squad && <span style={{ marginLeft: 6 }}>Squad: {existing.squad.number}{existing.squad.name ? ` (${existing.squad.name})` : ''}</span>}
            </div>
          )}
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

// ── Unlock Modal (instructor: toggle cohort access per assignment) ─────────────
function UnlockModal({ courseId, assignment, onClose }) {
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);
  const [unlocked, setUnlocked] = useState(
    () => new Set((assignment.unlocks ?? []).map((u) => u.cohort_id))
  );

  useEffect(() => {
    listCohorts(courseId).then(setCohorts).finally(() => setLoading(false));
  }, [courseId]);

  const toggle = async (cohortId, isCurrentlyUnlocked) => {
    setWorking(cohortId);
    try {
      if (isCurrentlyUnlocked) {
        await lockAssignment(courseId, assignment.id, cohortId);
        setUnlocked((s) => { const n = new Set(s); n.delete(cohortId); return n; });
      } else {
        await unlockAssignment(courseId, assignment.id, cohortId);
        setUnlocked((s) => new Set([...s, cohortId]));
      }
    } finally { setWorking(null); }
  };

  return (
    <Modal title={`Cohort Access — ${assignment.title}`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : cohorts.length === 0 ? (
        <p className="text-muted text-sm">No cohorts found. Create cohorts first.</p>
      ) : (
        <div>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Students can only see and submit this assignment once it is unlocked for their cohort.
          </p>
          {cohorts.map((c) => {
            const isUnlocked = unlocked.has(c.id);
            return (
              <div key={c.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="fw-600">{c.name}</span>
                  {!c.is_active && <span className="badge badge-gray">Inactive</span>}
                  <span className={`badge ${isUnlocked ? 'badge-green' : 'badge-gray'}`}>
                    {isUnlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <button
                  className={`btn btn-sm ${isUnlocked ? 'btn-secondary' : 'btn-primary'}`}
                  disabled={working === c.id}
                  onClick={() => toggle(c.id, isUnlocked)}
                >
                  {working === c.id ? '…' : isUnlocked ? 'Lock' : 'Unlock'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ── Progress Modal (instructor: live polling) ─────────────────────────────────
function ProgressModal({ courseId, assignment, onClose }) {
  const [subs,    setSubs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const intervalRef           = useRef(null);

  const load = useCallback(() =>
    getProgress(courseId, assignment.id)
      .then((d) => { setSubs(Array.isArray(d) ? d : d.submissions ?? []); setLoading(false); })
      .catch(() => setLoading(false)),
  [courseId, assignment.id]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 15000);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  return (
    <Modal title={`Progress — ${assignment.title}`} onClose={onClose}>
      {loading ? <LoadingSpinner /> : subs.length === 0 ? (
        <p className="text-muted text-sm">No progress data yet. Students who have started this assignment will appear here.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                {assignment.grading_mode === 'squad' && <th>Squad</th>}
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td>{s.student?.first_name} {s.student?.last_name}</td>
                  {assignment.grading_mode === 'squad' && (
                    <td>{s.squad ? `Squad ${s.squad.number}${s.squad.name ? ` (${s.squad.name})` : ''}` : '—'}</td>
                  )}
                  <td style={{ minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 8 }}>
                        <div style={{
                          width: `${s.progress ?? 0}%`,
                          background: s.progress >= 100 ? 'var(--success)' : 'var(--primary)',
                          borderRadius: 4, height: '100%', transition: 'width .3s',
                        }} />
                      </div>
                      <span className="text-xs" style={{ width: 34, textAlign: 'right' }}>{s.progress ?? 0}%</span>
                    </div>
                  </td>
                  <td><span className="badge badge-blue">{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted" style={{ padding: '8px 4px' }}>Auto-refreshes every 15 seconds.</p>
        </div>
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
  const [query,    setQuery]    = useState('');
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [adding,   setAdding]   = useState(false);
  const [selected, setSelected] = useState(new Set());

  const memberIds = new Set((cohort.members ?? []).map((m) => m.id));

  const search = useCallback(async (q) => {
    setLoading(true);
    try {
      // No query yet — browse a list of active users instead of showing nothing
      const res = await getUsers(q.trim() ? { search: q, is_active: true, limit: 20 } : { is_active: true, limit: 50 });
      const list = res.data ?? res.users ?? res ?? [];
      setUsers([...list].sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`)));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const selectableUsers = users.filter((u) => !memberIds.has(u.id));
  const allSelected = selectableUsers.length > 0 && selectableUsers.every((u) => selected.has(u.id));

  const toggleUser = (userId) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((s) => {
      if (allSelected) return new Set();
      return new Set(selectableUsers.map((u) => u.id));
    });
  };

  const handleAddSelected = async () => {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      await addMembers(courseId, cohort.id, [...selected]);
      setSelected(new Set());
      onSave();
    } finally { setAdding(false); }
  };

  return (
    <Modal title={`Add Members — ${cohort.name}`} onClose={onClose}>
      <div className="form-group">
        <input
          placeholder="Search by name or email, or browse the list below…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      {loading && <LoadingSpinner />}
      {!loading && users.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 28 }}>
                  {selectableUsers.length > 0 && (
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} title="Select all" />
                  )}
                </th>
                <th>Name</th><th>Email</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMember = memberIds.has(u.id);
                return (
                  <tr key={u.id}>
                    <td>
                      {!isMember && (
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleUser(u.id)}
                        />
                      )}
                    </td>
                    <td>{u.first_name} {u.last_name}</td>
                    <td className="text-sm text-muted">{u.email}</td>
                    <td>
                      {isMember && <span className="badge badge-green">Enrolled</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!loading && selectableUsers.length > 0 && (
        <div className="flex-end" style={{ gap: 8, marginTop: 12 }}>
          <span className="text-sm text-muted" style={{ marginRight: 'auto' }}>
            {selected.size} selected
          </span>
          <button className="btn btn-primary btn-sm" disabled={selected.size === 0 || adding} onClick={handleAddSelected}>
            {adding ? 'Adding…' : `Add ${selected.size || ''} Selected`.trim()}
          </button>
        </div>
      )}
      {!loading && users.length === 0 && (
        <p className="text-muted text-sm">
          {query.trim() ? 'No matching users found.' : 'No active users found.'}
        </p>
      )}
    </Modal>
  );
}

// ── Cohorts Tab ───────────────────────────────────────────────────────────────
function CohortsTab({ courseId }) {
  const [cohorts,     setCohorts]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [cohortModal, setCohortModal] = useState(null);
  const [delCohort,   setDelCohort]   = useState(null);
  const [addModal,    setAddModal]    = useState(null);
  const [removingId,  setRemovingId]  = useState(null);
  const [subTab,      setSubTab]      = useState('members');

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
              onClick={() => { setSelected(c); setSubTab('members'); }}
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
          <div className="empty-state"><p>Select a cohort to view details.</p></div>
        ) : (
          <div className="card">
            <div className="card-body">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>{selected.name}</h3>
                  {(selected.start_date || selected.end_date) && (
                    <p className="text-sm text-muted">
                      {selected.start_date ? new Date(selected.start_date).toLocaleDateString() : '?'}
                      {' – '}
                      {selected.end_date ? new Date(selected.end_date).toLocaleDateString() : 'ongoing'}
                    </p>
                  )}
                  {!selected.is_active && <span className="badge badge-gray" style={{ marginTop: 4 }}>Inactive</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className={`btn btn-sm ${selected.target_revealed ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ fontWeight: 600, fontSize: 11, letterSpacing: '.05em' }}
                    onClick={async () => {
                      const updated = await updateCohort(courseId, selected.id, { target_revealed: !selected.target_revealed });
                      setCohorts((prev) => prev.map((c) => c.id === selected.id ? { ...c, ...updated } : c));
                      setSelected((prev) => ({ ...prev, ...updated }));
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {selected.target_revealed ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
                        </svg>
                      )}
                      {selected.target_revealed ? 'Conceal Target' : 'Reveal Target'}
                    </span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setCohortModal(selected)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDelCohort(selected)}>Delete</button>
                </div>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                {['members', 'squads'].map((t) => (
                  <button
                    key={t}
                    className={`btn btn-sm ${subTab === t ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSubTab(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>

              {/* Members sub-tab */}
              {subTab === 'members' && (
                <>
                  <div className="flex-end" style={{ marginBottom: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setAddModal(selected)}>+ Add Member</button>
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
                </>
              )}

              {/* Squads sub-tab */}
              {subTab === 'squads' && (
                <SquadsPanel
                  courseId={courseId}
                  cohortId={selected.id}
                  cohortMembers={selected.members ?? []}
                />
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

// ── Course Gradebook ──────────────────────────────────────────────────────────
function GradesTab({ courseId }) {
  const [cohorts,  setCohorts]  = useState([]);
  const [cohortId, setCohortId] = useState('');
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    listCohorts(courseId).then(setCohorts).catch(() => {});
  }, [courseId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    getCourseGrades(courseId, cohortId || null)
      .then(setRows)
      .catch(() => setError('Failed to load grades.'))
      .finally(() => setLoading(false));
  }, [courseId, cohortId]);

  if (loading) return <LoadingSpinner />;
  if (error)   return <div className="alert alert-error">{error}</div>;

  /* pivot flat rows → assignments list + students map */
  const assignmentMap = new Map();
  const studentMap    = new Map();
  rows.forEach((r) => {
    if (!assignmentMap.has(r.assignmentId)) {
      assignmentMap.set(r.assignmentId, {
        id: r.assignmentId, title: r.assignmentTitle,
        max: parseFloat(r.assignmentMax ?? 0), order: r.orderIndex,
      });
    }
    if (!studentMap.has(r.userId)) {
      studentMap.set(r.userId, {
        id: r.userId, firstName: r.firstName, lastName: r.lastName,
        email: r.email, cohortName: r.cohortName, grades: {},
      });
    }
    if (r.score !== null && r.score !== undefined) {
      // Prefer the grade's own max_score — the assignment's static max_score
      // can diverge from an auto-graded quiz's real point total (see grade.service.js).
      studentMap.get(r.userId).grades[r.assignmentId] = {
        score: parseFloat(r.score), max: parseFloat(r.gradeMax ?? r.assignmentMax ?? 0),
        feedback: r.feedback, gradedAt: r.gradedAt, submissionStatus: r.submissionStatus,
      };
    } else if (r.submissionStatus) {
      studentMap.get(r.userId).grades[r.assignmentId] = { score: null, submissionStatus: r.submissionStatus };
    }
  });

  const assignments = [...assignmentMap.values()].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const students    = [...studentMap.values()].sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));

  if (students.length === 0) return (
    <div className="empty-state">
      <p>{cohortId ? 'No students or grades found for this cohort.' : 'No enrolled students or grades yet.'}</p>
    </div>
  );

  const pctColor = (pct) => pct >= 80 ? 'var(--success)' : pct >= 60 ? '#f59e0b' : 'var(--danger)';
  const COL = 44; // px per assignment column

  return (
    <div>
      {/* Cohort filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label className="text-sm fw-600">Cohort</label>
        <select
          value={cohortId}
          onChange={(e) => setCohortId(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14, background: 'white' }}
        >
          <option value="">All cohorts</option>
          {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-xs text-muted">{students.length} student{students.length !== 1 ? 's' : ''} · {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
          <thead>
            <tr style={{ verticalAlign: 'bottom' }}>
              {/* Student name — fixed width */}
              <th style={{
                position: 'sticky', left: 0, zIndex: 2,
                background: 'var(--surface, #f8fafc)',
                width: 180, minWidth: 180, padding: '0 10px 6px',
                borderBottom: '2px solid var(--border)', textAlign: 'left',
                fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.04em',
              }}>Student</th>

              {/* Cohort column when not filtered */}
              {!cohortId && (
                <th style={{
                  position: 'sticky', left: 180, zIndex: 2,
                  background: 'var(--surface, #f8fafc)',
                  width: 110, minWidth: 110, padding: '0 10px 6px',
                  borderBottom: '2px solid var(--border)', textAlign: 'left',
                  fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '.04em',
                }}>Cohort</th>
              )}

              {/* Rotated assignment headers */}
              {assignments.map((a) => (
                <th key={a.id} style={{
                  width: COL, minWidth: COL, maxWidth: COL,
                  height: 100, padding: 0,
                  verticalAlign: 'bottom',
                  borderBottom: '2px solid var(--border)',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', bottom: 6, left: '50%',
                    transform: 'translateX(-50%) rotate(-60deg)',
                    transformOrigin: 'center bottom',
                    whiteSpace: 'nowrap',
                    fontSize: 11, fontWeight: 600,
                    color: 'var(--text)',
                    maxWidth: 130,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                  }} title={`${a.title} (max ${a.max})`}>
                    {a.title}
                  </div>
                </th>
              ))}

              {/* Total column */}
              <th style={{
                width: 90, minWidth: 90, padding: '0 10px 6px',
                borderBottom: '2px solid var(--border)',
                textAlign: 'center',
                fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.04em',
              }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {students.map((stu, si) => {
              const totalEarned = assignments.reduce((s, a) => s + (stu.grades[a.id]?.score ?? 0), 0);
              const totalMax    = assignments.reduce((s, a) => s + (stu.grades[a.id]?.max ?? a.max), 0);
              const totalPct    = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : null;
              const rowBg       = si % 2 === 0 ? 'white' : 'var(--surface, #f8fafc)';
              return (
                <tr key={stu.id} style={{ background: rowBg }}>
                  {/* Student name — sticky */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 1,
                    background: rowBg,
                    padding: '7px 10px',
                    borderBottom: '1px solid var(--border)',
                    minWidth: 180,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {stu.lastName}, {stu.firstName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{stu.email}</div>
                  </td>

                  {/* Cohort */}
                  {!cohortId && (
                    <td style={{
                      position: 'sticky', left: 180, zIndex: 1,
                      background: rowBg,
                      padding: '7px 10px',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 12, color: 'var(--muted)',
                      whiteSpace: 'nowrap',
                    }}>{stu.cohortName ?? '—'}</td>
                  )}

                  {/* Grade cells */}
                  {assignments.map((a) => {
                    const g = stu.grades[a.id];
                    const borderStyle = '1px solid var(--border)';
                    const cellBase = { width: COL, minWidth: COL, maxWidth: COL, padding: '7px 2px', textAlign: 'center', borderBottom: borderStyle, fontSize: 12 };

                    if (!g) return <td key={a.id} style={{ ...cellBase, color: 'var(--muted)' }}>·</td>;

                    if (g.score === null) return (
                      <td key={a.id} style={cellBase}
                        title={`${a.title} — ${g.submissionStatus}`}>
                        <span style={{ fontSize: 10, background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '1px 4px' }}>
                          sub
                        </span>
                      </td>
                    );

                    const pct = g.max > 0 ? Math.round((g.score / g.max) * 100) : 0;
                    const tip = [
                      `${a.title}`,
                      `Score: ${g.score}/${g.max} (${pct}%)`,
                      g.feedback ? `Feedback: ${g.feedback}` : null,
                      g.gradedAt ? `Graded: ${new Date(g.gradedAt).toLocaleDateString()}` : null,
                    ].filter(Boolean).join('\n');
                    return (
                      <td key={a.id} style={cellBase} title={tip}>
                        <span style={{ fontWeight: 700, color: pctColor(pct), fontSize: 13 }}>{g.score}</span>
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td style={{ padding: '7px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                    {totalPct !== null ? (
                      <>
                        <span style={{ fontWeight: 700, color: pctColor(totalPct), fontSize: 13 }}>{Math.round(totalEarned)}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}> /{Math.round(totalMax)}</span>
                        <div style={{ fontSize: 10, color: pctColor(totalPct) }}>{totalPct}%</div>
                      </>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted" style={{ marginTop: 8 }}>
        Hover a cell to see full assignment name, score, and feedback. <strong>sub</strong> = submitted, not yet graded. · = no submission.
      </p>
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
  const [enrolled,    setEnrolled]    = useState(null);
  const [enrolling,   setEnrolling]   = useState(false);

  const [moduleModal,   setModuleModal]   = useState(null);
  const [delModule,     setDelModule]     = useState(null);
  const [assignModal,   setAssignModal]   = useState(null);
  const [delAssign,     setDelAssign]     = useState(null);
  const [gradesModal,   setGradesModal]   = useState(null);
  const [submitModal,   setSubmitModal]   = useState(null);
  const [unlockModal,   setUnlockModal]   = useState(null);
  const [progressModal, setProgressModal] = useState(null);

  const loadCourse      = useCallback(() => getCourse(id).then(setCourse).catch(() => navigate('/courses')), [id]);
  const loadAssignments = useCallback(() => getAssignments(id).then((d) => setAssignments(d.data ?? d.assignments ?? d ?? [])), [id]);

  useEffect(() => {
    Promise.all([getCourse(id), getAssignments(id)])
      .then(([c, a]) => { setCourse(c); setAssignments(a.data ?? a.assignments ?? a ?? []); })
      .catch(() => navigate('/courses'))
      .finally(() => setLoading(false));
  }, [id]);

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
          {course.status === 'published' && (
            <button
              className="btn btn-primary"
              onClick={async () => {
                try { window.open(await getLaunchUrl(), '_blank', 'noopener,noreferrer'); }
                catch { alert('Could not launch PACT. Please try again.'); }
              }}
            >
              Launch PACT ↗
            </button>
          )}
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
        {['modules', 'assignments', ...(canManage ? ['grades', 'cohorts', 'enrollments'] : [])].map((t) => (
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
                        <th>Title</th>
                        <th>Type</th>
                        <th>Max Score</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => {
                        const unlockedCount = a.unlocks?.length ?? 0;
                        const isLocked = a.is_unlocked === false; // student view flag
                        return (
                          <tr key={a.id}>
                            <td className="fw-600">{a.title}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <span className={`badge ${TYPE_BADGE[a.type] ?? 'badge-blue'}`}>{a.type ?? 'module'}</span>
                                {a.grading_mode === 'squad' && <span className="badge badge-gray">squad graded</span>}
                              </div>
                            </td>
                            <td>{a.max_score}</td>
                            <td className="text-sm text-muted">{a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                {a.is_published
                                  ? <span className="badge badge-green">Published</span>
                                  : <span className="badge badge-gray">Draft</span>}
                                {isStudent && isLocked && <span className="badge badge-gray">Locked</span>}
                                {canManage && a.unlocks !== undefined && (
                                  <span className="badge badge-blue">{unlockedCount} unlocked</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {isStudent && a.is_published && !isLocked && (
                                  <button className="btn btn-primary btn-xs" onClick={() => setSubmitModal(a)}>Submit</button>
                                )}
                                {canManage && (
                                  <>
                                    <button className="btn btn-ghost btn-xs" onClick={() => setGradesModal(a)}>Grades</button>
                                    <button className="btn btn-ghost btn-xs" onClick={() => setProgressModal(a)}>Progress</button>
                                    <button className="btn btn-ghost btn-xs" onClick={() => setUnlockModal(a)}>Locks</button>
                                    <button className="btn btn-ghost btn-xs" onClick={() => setAssignModal(a)}>Edit</button>
                                    <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => setDelAssign(a)}>Delete</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
        </div>
      )}

      {/* ── Grades ── */}
      {tab === 'grades' && canManage && <GradesTab courseId={id} />}

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
      {unlockModal && (
        <UnlockModal courseId={id} assignment={unlockModal} onClose={() => setUnlockModal(null)} />
      )}
      {progressModal && (
        <ProgressModal courseId={id} assignment={progressModal} onClose={() => setProgressModal(null)} />
      )}
    </div>
  );
}
