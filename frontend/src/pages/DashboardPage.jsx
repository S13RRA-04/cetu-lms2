import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore.js';
import { getCourses } from '../api/courses.js';
import { getUsers } from '../api/users.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';

function StatusBadge({ status }) {
  const cls = status === 'published' ? 'badge-green' : status === 'archived' ? 'badge-gray' : 'badge-blue';
  return <span className={`badge ${cls}`}>{status}</span>;
}

function statusColor(status) {
  return status === 'published' ? 'var(--success)' : status === 'archived' ? 'var(--text-muted)' : 'var(--accent)';
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin  = user && ['admin', 'superadmin'].includes(user.role);
  const canManage = isAdmin || user?.role === 'instructor';

  const [courses,    setCourses]    = useState([]);
  const [meta,       setMeta]       = useState({});
  const [userCount,  setUserCount]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [searchVal,  setSearchVal]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const tasks = [
      getCourses({ search: search || undefined, limit: 9 }),
      isAdmin ? getUsers({ limit: 1 }) : Promise.resolve(null),
    ];
    Promise.all(tasks)
      .then(([c, u]) => {
        setCourses(c.data ?? c.courses ?? []);
        setMeta(c.meta ?? {});
        if (u) setUserCount(u.meta?.total ?? u.total ?? '—');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchVal);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.first_name}!</h1>
          <p>Here's what's happening in your LMS.</p>
        </div>
        {canManage && <Link to="/courses/new" className="btn btn-primary">+ New Course</Link>}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Courses</div>
          <div className="stat-value">{meta.total ?? '—'}</div>
          <div className="stat-sub">in the system</div>
        </div>
        {isAdmin && (
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{userCount ?? '—'}</div>
            <div className="stat-sub">registered</div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">Your Role</div>
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 20, textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Courses</h2>
          <Link to="/courses" className="btn btn-ghost btn-sm">View all →</Link>
        </div>
        <div style={{ padding: '12px 20px 0' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <div className="search-input" style={{ flex: 1 }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search courses…"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary">Search</button>
            {search && (
              <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setSearchVal(''); }}>Clear</button>
            )}
          </form>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : courses.length === 0 ? (
          <div className="empty-state">
            <p>{search ? `No courses matching "${search}".` : 'No courses yet.'}</p>
            {canManage && !search && (
              <Link to="/courses/new" className="btn btn-primary" style={{ marginTop: 12 }}>Create your first course</Link>
            )}
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div className="courses-grid">
              {courses.map((course) => (
                <Link key={course.id} to={`/courses/${course.id}`} className="course-card">
                  <div className="course-card-thumb" style={{ background: statusColor(course.status) }} />
                  <div className="course-card-body">
                    <h3>{course.title}</h3>
                    <p className="text-xs text-muted mt-4">{course.course_code}</p>
                    {course.instructor && (
                      <p className="text-xs text-muted mt-4">{course.instructor.first_name} {course.instructor.last_name}</p>
                    )}
                  </div>
                  <div className="course-card-footer">
                    <StatusBadge status={course.status} />
                    {course.start_date && (
                      <span className="text-xs text-muted">{new Date(course.start_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
