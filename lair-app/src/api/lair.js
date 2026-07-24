import client from './client.js';

export const COURSE_ID = 'b3e1f7a2-4c8d-4e9f-a012-3d5678901234';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const logout = () =>
  client.post('/auth/logout', {}, { withCredentials: true });

export const getMyEnrollment = () =>
  client.get(`/courses/${COURSE_ID}/enrollment/me`).then((r) => r.data);

export const getAssignments = () =>
  client.get(`/courses/${COURSE_ID}/assignments?limit=200`).then((r) => r.data);

export const getAssignment = (id) =>
  client.get(`/courses/${COURSE_ID}/assignments/${id}`).then((r) => r.data);

export const updateAssignment = (id, data) =>
  client.put(`/courses/${COURSE_ID}/assignments/${id}`, data).then((r) => r.data);

export const getMySubmission = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/submissions/mine`).then((r) => r.data);

export const submitAssignment = (assignmentId, content) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/submit`, { content }).then((r) => r.data);

export const updateProgress = (assignmentId, progress, quizState) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/progress`, {
    progress,
    ...(quizState ? { quiz_state: quizState } : {}),
  }).then((r) => r.data);

/* ── Grades ── */
export const getMyGrades = () =>
  client.get(`/courses/${COURSE_ID}/grades/me`).then((r) => r.data);

/* ── Admin / instructor ── */
export const getAdminAssignments = () =>
  client.get(`/courses/${COURSE_ID}/assignments?limit=200&manage=1`).then((r) => {
    const raw = r.data;
    return Array.isArray(raw) ? raw : (raw.data ?? []);
  });

export const getSubmissions = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/submissions`).then((r) => r.data);

export const getGradesForAssignment = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/grades`).then((r) => r.data);

export const submitGrade = (assignmentId, userId, data) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/grades/${userId}`, data).then((r) => r.data);

export const getSurveyResults = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/survey-results`).then((r) => r.data);

/* ── Cohorts ── */
export const getCohorts = () =>
  client.get(`/courses/${COURSE_ID}/cohorts`).then((r) => {
    const raw = r.data;
    return Array.isArray(raw) ? raw : (raw.data ?? []);
  });

/* ── Assignment gating ── */
export const unlockAssignment = (assignmentId, cohortId) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/unlock`, { cohort_id: cohortId }).then((r) => r.data);

export const lockAssignment = (assignmentId, cohortId) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/lock`, { cohort_id: cohortId }).then((r) => r.data);

/* ── Course Content ── */
export const getCourseContent = () =>
  client.get(`/courses/${COURSE_ID}/course-content`).then((r) => r.data);

export const getAdminCourseContent = () =>
  client.get(`/courses/${COURSE_ID}/course-content?manage=1`).then((r) => r.data);

export const createContentLink = (data) =>
  client.post(`/courses/${COURSE_ID}/course-content`, data).then((r) => r.data);

export const uploadContentFile = (file, meta) => {
  const token = localStorage.getItem('accessToken');
  const params = new URLSearchParams(meta).toString();
  return fetch(
    `${client.defaults.baseURL}/courses/${COURSE_ID}/course-content/upload?${params}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'X-File-Name':  file.name,
        'Authorization': `Bearer ${token}`,
      },
      body: file,
    },
  ).then((r) => { if (!r.ok) throw new Error('Upload failed'); return r.json(); });
};

export const updateContentItem = (id, data) =>
  client.put(`/courses/${COURSE_ID}/course-content/${id}`, data).then((r) => r.data);

export const deleteContentItem = (id) =>
  client.delete(`/courses/${COURSE_ID}/course-content/${id}`);

export const unlockContentItem = (id, cohortId) =>
  client.post(`/courses/${COURSE_ID}/course-content/${id}/unlock`, { cohort_id: cohortId }).then((r) => r.data);

export const lockContentItem = (id, cohortId) =>
  client.post(`/courses/${COURSE_ID}/course-content/${id}/lock`, { cohort_id: cohortId }).then((r) => r.data);
