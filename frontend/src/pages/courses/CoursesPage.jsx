import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getCourses, deleteCourse } from '../../api/courses.js';
import useAuthStore from '../../store/authStore.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import Pagination from '../../components/common/Pagination.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';

function StatusBadge({ status }) {
  const cls = status === 'published' ? 'badge-green' : status === 'archived' ? 'badge-gray' : 'badge-blue';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export default function CoursesPage() {
  const { user }                  = useAuthStore();
  const isAdmin                   = user && ['admin', 'superadmin'].includes(user.role);
  const canManage                 = isAdmin || user?.role === 'instructor';
  const [courses, setCourses]     = useState([]);
  const [meta, setMeta]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]           = useState(1);
  const [delTarget, setDelTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getCourses({ search: search || undefined, status: statusFilter || undefined, page, limit: 12 })
      .then((data) => {
        setCourses(data.data ?? data.courses ?? []);
        setMeta(data.meta ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearchSubmit = (e) => { e.preventDefault(); setPage(1); load(); };

  const handleDelete = async () => {
    await deleteCourse(delTarget.id);
    setDelTarget(null);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Courses</h1>
          <p>{meta.total ?? ''} course{meta.total !== 1 ? 's' : ''} available</p>
        </div>
        {canManage && <Link to="/courses/new" className="btn btn-primary">+ New Course</Link>}
      </div>

      <div className="toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <div className="search-input" style={{ flex: 1 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search courses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
        </form>
        {isAdmin && (
          <select value={statusFilter} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ width: 140 }}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : courses.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <h3 style={{ marginTop: 8 }}>No courses found</h3>
          {canManage && <Link to="/courses/new" className="btn btn-primary" style={{ marginTop: 12 }}>Create a course</Link>}
        </div>
      ) : (
        <>
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course.id} className="course-card" style={{ cursor: 'default' }}>
                <div className="course-card-thumb" style={{ background: course.status === 'published' ? 'var(--success)' : course.status === 'archived' ? 'var(--text-muted)' : 'var(--accent)' }} />
                <div className="course-card-body" style={{ flex: 1 }}>
                  <Link to={`/courses/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3>{course.title}</h3>
                  </Link>
                  <p className="text-xs text-muted mt-4">{course.course_code}</p>
                  {course.instructor && (
                    <p className="text-xs text-muted mt-4">{course.instructor.first_name} {course.instructor.last_name}</p>
                  )}
                  {course.description && (
                    <p className="text-sm mt-8" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {course.description}
                    </p>
                  )}
                </div>
                <div className="course-card-footer">
                  <StatusBadge status={course.status} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Link to={`/courses/${course.id}`} className="btn btn-ghost btn-xs">View</Link>
                    {canManage && (
                      <>
                        <Link to={`/courses/${course.id}/edit`} className="btn btn-ghost btn-xs">Edit</Link>
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--danger)' }} onClick={() => setDelTarget(course)}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={meta.totalPages ?? 1} onChange={setPage} />
        </>
      )}

      {delTarget && (
        <ConfirmDialog
          title="Delete Course"
          message={`Are you sure you want to delete "${delTarget.title}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
