import client from './client.js';

export const COURSE_ID = 'ae2fbd25-2f41-45b1-b9f8-f4fefbad4b63';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const logout = () =>
  client.post('/auth/logout', {}, { withCredentials: true });

export const getMyEnrollment = () =>
  client.get(`/courses/${COURSE_ID}/enrollment/me`).then((r) => r.data);

export const getAssignments = () =>
  client.get(`/courses/${COURSE_ID}/assignments`).then((r) => r.data);

export const getAssignment = (id) =>
  client.get(`/courses/${COURSE_ID}/assignments/${id}`).then((r) => r.data);

export const getMySubmission = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/submissions/mine`).then((r) => r.data);

export const submitAssignment = (assignmentId, content) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/submit`, { content }).then((r) => r.data);

export const updateProgress = (assignmentId, progress) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/progress`, { progress }).then((r) => r.data);
