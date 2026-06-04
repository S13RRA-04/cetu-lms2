import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCourse, createCourse, updateCourse } from '../../api/courses.js';
import { getUsers } from '../../api/users.js';
import useAuthStore, { isAdminRole } from '../../store/authStore.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';

export default function CourseFormPage() {
  const { id }      = useParams();
  const isEdit      = Boolean(id);
  const navigate    = useNavigate();
  const { user }    = useAuthStore();
  const isAdmin     = user && isAdminRole(user.role);

  const [form, setForm] = useState({
    title: '', description: '', course_code: '', instructor_id: '',
    status: 'draft', platform: 'pact', thumbnail_url: '', start_date: '', end_date: '',
  });
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading]         = useState(isEdit);
  const [saving,  setSaving]          = useState(false);
  const [error,   setError]           = useState('');

  useEffect(() => {
    const tasks = [
      isAdmin ? getUsers({ role: 'instructor', limit: 100 }).then((d) => setInstructors(d.data ?? d.users ?? [])) : Promise.resolve(),
    ];
    if (isEdit) {
      tasks.push(
        getCourse(id).then((c) => setForm({
          title:         c.title ?? '',
          description:   c.description ?? '',
          course_code:   c.course_code ?? '',
          instructor_id: c.instructor_id ?? '',
          status:        c.status ?? 'draft',
          platform:      c.platform ?? 'pact',
          thumbnail_url: c.thumbnail_url ?? '',
          start_date:    c.start_date ? c.start_date.slice(0, 10) : '',
          end_date:      c.end_date   ? c.end_date.slice(0, 10)   : '',
        }))
      );
    }
    Promise.all(tasks).catch(() => {}).finally(() => setLoading(false));
  }, [id, isEdit, isAdmin]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title:         form.title,
        description:   form.description   || undefined,
        course_code:   form.course_code,
        instructor_id: form.instructor_id || undefined,
        status:        form.status,
        platform:      form.platform,
        thumbnail_url: form.thumbnail_url || undefined,
        start_date:    form.start_date    || undefined,
        end_date:      form.end_date      || undefined,
      };
      if (isEdit) await updateCourse(id, payload);
      else        await createCourse(payload);
      navigate('/courses');
    } catch (err) {
      setError(err.response?.data?.error?.message ?? 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-header">
        <div>
          <div className="flex-center gap-8" style={{ marginBottom: 4 }}>
            <Link to="/courses" className="text-muted text-sm">Courses</Link>
            <span className="text-muted text-sm">/</span>
            <span className="text-sm">{isEdit ? 'Edit' : 'New Course'}</span>
          </div>
          <h1>{isEdit ? 'Edit Course' : 'New Course'}</h1>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <div className="form-group">
                <label>Course Title *</label>
                <input value={form.title} onChange={set('title')} required maxLength={255} />
              </div>
              <div className="form-group">
                <label>Course Code *</label>
                <input value={form.course_code} onChange={set('course_code')} required maxLength={50} placeholder="e.g. CS-101" />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={set('description')} rows={4} />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={set('status')}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="form-group">
                <label>Platform</label>
                <input value="CETU LMS" readOnly disabled style={{ background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
              </div>
            </div>

            <div className="grid-2">
              {isAdmin && instructors.length > 0 && (
                <div className="form-group">
                  <label>Instructor</label>
                  <select value={form.instructor_id} onChange={set('instructor_id')}>
                    <option value="">— select —</option>
                    {instructors.map((u) => (
                      <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={form.start_date} onChange={set('start_date')} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={form.end_date} onChange={set('end_date')} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Thumbnail URL</label>
              <input value={form.thumbnail_url} onChange={set('thumbnail_url')} placeholder="https://…" />
            </div>

            <hr className="divider" />

            <div className="flex-between">
              <Link to="/courses" className="btn btn-secondary">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
