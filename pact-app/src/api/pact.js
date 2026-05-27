import client from './client.js';

export const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

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

export const getMySubmission = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/submissions/mine`).then((r) => r.data);

export const submitAssignment = (assignmentId, content) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/submit`, { content }).then((r) => r.data);

export const updateProgress = (assignmentId, progress) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/progress`, { progress }).then((r) => r.data);

/* ── Grades ── */
export const getMyGrades = () =>
  client.get(`/courses/${COURSE_ID}/grades/me`).then((r) => r.data);

/* ── Scoreboard ── */
export const getScoreboard = () =>
  client.get(`/courses/${COURSE_ID}/scoreboard`).then((r) => r.data);

/* ── Admin / instructor ── */
export const getAdminAssignments = () =>
  client.get(`/courses/${COURSE_ID}/assignments?limit=200`).then((r) => {
    const raw = r.data;
    return Array.isArray(raw) ? raw : (raw.data ?? []);
  });

export const getSubmissions = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/submissions`).then((r) => r.data);

export const getGradesForAssignment = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/grades`).then((r) => r.data);

export const submitGrade = (assignmentId, userId, data) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/grades/${userId}`, data).then((r) => r.data);

export const submitSquadGrade = (assignmentId, squadId, data) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/grades/squad/${squadId}`, data).then((r) => r.data);

/* ── Cohorts ── */
export const getCohorts = () =>
  client.get(`/courses/${COURSE_ID}/cohorts`).then((r) => {
    const raw = r.data;
    return Array.isArray(raw) ? raw : (raw.data ?? []);
  });

/* ── Scenarios ── */
export const getScenarios = () =>
  client.get(`/courses/${COURSE_ID}/scenarios`).then((r) => r.data);

export const getScenarioDownloadUrl = (packageId) =>
  client.get(`/courses/${COURSE_ID}/scenarios/${packageId}/download`).then((r) => r.data);

export const createScenario = (data) =>
  client.post(`/courses/${COURSE_ID}/scenarios`, data).then((r) => r.data);

export const updateScenario = (packageId, data) =>
  client.put(`/courses/${COURSE_ID}/scenarios/${packageId}`, data).then((r) => r.data);

export const deleteScenario = (packageId) =>
  client.delete(`/courses/${COURSE_ID}/scenarios/${packageId}`);

export const unlockScenario = (packageId, cohortId) =>
  client.post(`/courses/${COURSE_ID}/scenarios/${packageId}/unlock`, { cohort_id: cohortId }).then((r) => r.data);

export const lockScenario = (packageId, cohortId) =>
  client.post(`/courses/${COURSE_ID}/scenarios/${packageId}/lock`, { cohort_id: cohortId });

/* ── Assignment gating ── */
export const unlockAssignment = (assignmentId, cohortId) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/unlock`, { cohort_id: cohortId }).then((r) => r.data);

export const lockAssignment = (assignmentId, cohortId) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/lock`, { cohort_id: cohortId }).then((r) => r.data);
