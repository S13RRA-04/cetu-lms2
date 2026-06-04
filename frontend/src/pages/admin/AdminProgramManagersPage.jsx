import { useEffect, useState, useCallback } from 'react';
import { getUsers, updateUser } from '../../api/users.js';
import { getCourses, updateCourse } from '../../api/courses.js';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import Modal from '../../components/common/Modal.jsx';

const STATUS_BADGE = {
  published: <span className="badge badge-green" style={{ fontSize: 10 }}>Published</span>,
  draft:     <span className="badge badge-blue"  style={{ fontSize: 10 }}>Draft</span>,
  archived:  <span className="badge badge-gray"  style={{ fontSize: 10 }}>Archived</span>,
};

/* ── Promote-user search modal ─────────────────────────────────────────────── */
function PromoteModal({ onClose, onPromoted }) {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [working,  setWorking]  = useState(null);
  const [error,    setError]    = useState('');

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await getUsers({ search: q, limit: 20 });
      setResults(data.data ?? data.users ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const promote = async (user) => {
    setWorking(user.id);
    setError('');
    try {
      await updateUser(user.id, { role: 'instructor' });
      onPromoted(user);
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Failed to promote user.');
    } finally { setWorking(null); }
  };

  return (
    <Modal title="Add Program Manager" onClose={onClose}>
      <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
        Search for an existing user to promote to Program Manager. Instructors can be assigned to courses and manage cohorts.
      </p>
      <div className="form-group">
        <input
          autoFocus
          placeholder="Search by name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && <div className="alert alert-error" style={{ marginBottom: 8 }}>{error}</div>}
      {loading && <LoadingSpinner />}
      {!loading && results.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {results.map((u) => (
                <tr key={u.id}>
                  <td className="fw-600">{u.first_name} {u.last_name}</td>
                  <td className="text-sm text-muted">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'instructor' ? 'badge-blue' : u.role === 'admin' ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.role === 'instructor' ? (
                      <span className="text-xs text-muted">Already a PM</span>
                    ) : (
                      <button
                        className="btn btn-primary btn-xs"
                        disabled={working === u.id}
                        onClick={() => promote(u)}
                      >
                        {working === u.id ? '…' : 'Make Program Manager'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && query.trim() && results.length === 0 && (
        <p className="text-muted text-sm">No users found. Create one via the Users page first.</p>
      )}
    </Modal>
  );
}

/* ── Confirm reassign dialog ───────────────────────────────────────────────── */
function ReassignDialog({ course, fromPM, toPM, onConfirm, onCancel }) {
  return (
    <Modal title="Reassign Course" onClose={onCancel}>
      <p className="text-sm" style={{ marginBottom: 16 }}>
        <strong>{course.title}</strong> is currently managed by{' '}
        <strong>{fromPM.first_name} {fromPM.last_name}</strong>.
        Reassigning it to <strong>{toPM.first_name} {toPM.last_name}</strong> will remove it from their portfolio.
      </p>
      <div className="flex-end" style={{ gap: 8 }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={onConfirm}>Reassign</button>
      </div>
    </Modal>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function AdminProgramManagersPage() {
  const [pms,          setPms]          = useState([]);
  const [courses,      setCourses]      = useState([]);
  const [selectedPM,   setSelectedPM]   = useState(null);
  const [loadingInit,  setLoadingInit]  = useState(true);
  const [pmSearch,     setPmSearch]     = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const [working,      setWorking]      = useState(null); // courseId being saved
  const [promoteModal, setPromoteModal] = useState(false);
  const [reassign,     setReassign]     = useState(null); // { course, fromPM }
  const [demoting,     setDemoting]     = useState(null); // pmId
  const [error,        setError]        = useState('');

  /* Reload everything — single source of truth */
  const reload = useCallback(async () => {
    try {
      const [userData, courseData] = await Promise.all([
        getUsers({ role: 'instructor', limit: 200 }),
        getCourses({ limit: 200 }),
      ]);
      const pmList     = userData.data ?? userData.users ?? [];
      const courseList = Array.isArray(courseData) ? courseData : (courseData.data ?? []);
      setPms(pmList);
      setCourses(courseList);
      /* Keep selectedPM in sync with fresh data */
      setSelectedPM((prev) => prev ? pmList.find((p) => p.id === prev.id) ?? null : null);
    } catch {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoadingInit(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /* Helpers */
  const coursesByPM = (pmId) => courses.filter((c) => c.instructor?.id === pmId);
  const unassigned  = courses.filter((c) => !c.instructor);
  const assignedElsewhere = (pmId) => courses.filter((c) => c.instructor && c.instructor.id !== pmId);

  const assign = async (course, toPM) => {
    /* If already assigned to another PM, require confirmation */
    if (course.instructor && course.instructor.id !== toPM.id) {
      setReassign({ course, fromPM: course.instructor });
      return;
    }
    doAssign(course.id, toPM.id);
  };

  const doAssign = async (courseId, pmId) => {
    setReassign(null);
    setWorking(courseId);
    setError('');
    try {
      await updateCourse(courseId, { instructor_id: pmId });
      await reload();
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Failed to assign course.');
    } finally { setWorking(null); }
  };

  const unassign = async (courseId) => {
    setWorking(courseId);
    setError('');
    try {
      await updateCourse(courseId, { instructor_id: null });
      await reload();
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Failed to unassign course.');
    } finally { setWorking(null); }
  };

  const demotePM = async (pm) => {
    if (!window.confirm(`Remove Program Manager role from ${pm.first_name} ${pm.last_name}? They will become a regular student account.`)) return;
    setDemoting(pm.id);
    try {
      await updateUser(pm.id, { role: 'student' });
      setSelectedPM(null);
      await reload();
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Failed to remove role.');
    } finally { setDemoting(null); }
  };

  /* Filtered lists for display */
  const filteredPMs = pms.filter((p) =>
    !pmSearch || `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(pmSearch.toLowerCase())
  );

  const selectedCourses   = selectedPM ? coursesByPM(selectedPM.id) : [];
  const availableCourses  = selectedPM
    ? [...unassigned, ...assignedElsewhere(selectedPM.id)]
    : [];
  const filteredAvailable = availableCourses.filter((c) =>
    !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  if (loadingInit) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Program Managers</h1>
          <p>Manage instructor accounts and their course assignments.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPromoteModal(true)}>
          + Add Program Manager
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* ── Left panel: PM roster ── */}
        <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <input
              placeholder="Search program managers…"
              value={pmSearch}
              onChange={(e) => setPmSearch(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>

          {filteredPMs.length === 0 ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <p className="text-muted text-sm">No program managers yet.</p>
                <p className="text-xs text-muted" style={{ marginTop: 6 }}>Click "+ Add Program Manager" to promote a user.</p>
              </div>
            </div>
          ) : filteredPMs.map((pm) => {
            const count    = coursesByPM(pm.id).length;
            const isActive = selectedPM?.id === pm.id;
            return (
              <div
                key={pm.id}
                onClick={() => { setSelectedPM(pm); setCourseSearch(''); }}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  background: isActive ? 'var(--accent-light)' : 'white',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 0 0 2px rgba(37,99,235,.15)' : 'var(--shadow)',
                  transition: 'all .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: isActive ? 'var(--accent)' : 'var(--primary)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {pm.first_name?.[0]}{pm.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pm.first_name} {pm.last_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pm.email}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: isActive ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>
                    {count} course{count !== 1 ? 's' : ''} assigned
                  </span>
                  {!pm.is_active && <span className="badge badge-gray" style={{ fontSize: 9 }}>Inactive</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Right panel: course assignment ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedPM ? (
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '60px 24px' }}>
                <svg width="40" height="40" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px' }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-muted" style={{ fontWeight: 500 }}>Select a program manager to manage their course assignments.</p>
              </div>
            </div>
          ) : (
            <>
              {/* PM header */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700,
                  }}>
                    {selectedPM.first_name?.[0]}{selectedPM.last_name?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedPM.first_name} {selectedPM.last_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedPM.email}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span className="badge badge-blue" style={{ fontSize: 10 }}>Program Manager</span>
                      {selectedPM.is_active
                        ? <span className="badge badge-green" style={{ fontSize: 10 }}>Active</span>
                        : <span className="badge badge-gray"  style={{ fontSize: 10 }}>Inactive</span>}
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>
                        {coursesByPM(selectedPM.id).length} course{coursesByPM(selectedPM.id).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      disabled={demoting === selectedPM.id || coursesByPM(selectedPM.id).length > 0}
                      title={coursesByPM(selectedPM.id).length > 0 ? 'Unassign all courses before removing PM role' : 'Remove PM role'}
                      onClick={() => demotePM(selectedPM)}
                    >
                      {demoting === selectedPM.id ? '…' : 'Remove PM Role'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Assigned courses */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>
                    Assigned Courses
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>({selectedCourses.length})</span>
                  </h3>
                </div>

                {selectedCourses.length === 0 ? (
                  <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>
                      No courses assigned yet. Assign courses from the list below.
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Course</th>
                            <th style={{ width: 90 }}>Status</th>
                            <th style={{ width: 100, textAlign: 'right' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCourses.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <div className="fw-600" style={{ fontSize: 13 }}>{c.title}</div>
                                <div className="text-xs text-muted">{c.course_code}</div>
                              </td>
                              <td>{STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="btn btn-ghost btn-xs"
                                  style={{ color: 'var(--danger)' }}
                                  disabled={working === c.id}
                                  onClick={() => unassign(c.id)}
                                >
                                  {working === c.id ? '…' : 'Unassign'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Available courses */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    Available Courses
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>({availableCourses.length})</span>
                  </h3>
                  <div className="search-input" style={{ maxWidth: 260 }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      placeholder="Filter courses…"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>

                {filteredAvailable.length === 0 ? (
                  <div className="card">
                    <div className="card-body" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>
                      {courseSearch ? 'No courses match your search.' : 'All courses are already assigned to this PM.'}
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Course</th>
                            <th style={{ width: 90 }}>Status</th>
                            <th style={{ width: 140 }}>Current PM</th>
                            <th style={{ width: 100, textAlign: 'right' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAvailable.map((c) => {
                            const hasPM = Boolean(c.instructor);
                            return (
                              <tr key={c.id} style={{ opacity: working === c.id ? .5 : 1 }}>
                                <td>
                                  <div className="fw-600" style={{ fontSize: 13 }}>{c.title}</div>
                                  <div className="text-xs text-muted">{c.course_code}</div>
                                </td>
                                <td>{STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}</td>
                                <td>
                                  {hasPM ? (
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                      {c.instructor.first_name} {c.instructor.last_name}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    className={`btn btn-xs ${hasPM ? 'btn-secondary' : 'btn-primary'}`}
                                    disabled={working === c.id}
                                    onClick={() => assign(c, selectedPM)}
                                  >
                                    {working === c.id ? '…' : hasPM ? 'Reassign' : 'Assign'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Promote modal ── */}
      {promoteModal && (
        <PromoteModal
          onClose={() => setPromoteModal(false)}
          onPromoted={async (user) => {
            setPromoteModal(false);
            await reload();
            /* Auto-select the newly promoted PM */
            setSelectedPM((prev) => prev ?? null);
          }}
        />
      )}

      {/* ── Reassign confirmation ── */}
      {reassign && (
        <ReassignDialog
          course={reassign.course}
          fromPM={reassign.fromPM}
          toPM={selectedPM}
          onConfirm={() => doAssign(reassign.course.id, selectedPM.id)}
          onCancel={() => setReassign(null)}
        />
      )}
    </div>
  );
}
