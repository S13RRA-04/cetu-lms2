import client from './client.js';

export const getCourses = (params) =>
  client.get('/courses', { params }).then((r) => r.data);

export const getCourse = (id) =>
  client.get(`/courses/${id}`).then((r) => r.data);

export const createCourse = (data) =>
  client.post('/courses', data).then((r) => r.data);

export const updateCourse = (id, data) =>
  client.put(`/courses/${id}`, data).then((r) => r.data);

export const deleteCourse = (id) =>
  client.delete(`/courses/${id}`).then((r) => r.data);

export const getModules = (courseId) =>
  client.get(`/courses/${courseId}/modules`).then((r) => r.data);

export const createModule = (courseId, data) =>
  client.post(`/courses/${courseId}/modules`, data).then((r) => r.data);

export const updateModule = (courseId, moduleId, data) =>
  client.put(`/courses/${courseId}/modules/${moduleId}`, data).then((r) => r.data);

export const deleteModule = (courseId, moduleId) =>
  client.delete(`/courses/${courseId}/modules/${moduleId}`).then((r) => r.data);

export const getEnrollments = (courseId, params) =>
  client.get(`/courses/${courseId}/enrollments`, { params }).then((r) => r.data);

export const enrollUser = (courseId, data) =>
  client.post(`/courses/${courseId}/enroll`, data).then((r) => r.data);

export const updateEnrollment = (courseId, userId, data) =>
  client.put(`/courses/${courseId}/enrollments/${userId}`, data).then((r) => r.data);

export const unenrollUser = (courseId, userId) =>
  client.delete(`/courses/${courseId}/enrollments/${userId}`).then((r) => r.data);

export const getAssignments = (courseId) =>
  client.get(`/courses/${courseId}/assignments`).then((r) => r.data);

export const createAssignment = (courseId, data) =>
  client.post(`/courses/${courseId}/assignments`, data).then((r) => r.data);

export const updateAssignment = (courseId, assignmentId, data) =>
  client.put(`/courses/${courseId}/assignments/${assignmentId}`, data).then((r) => r.data);

export const deleteAssignment = (courseId, assignmentId) =>
  client.delete(`/courses/${courseId}/assignments/${assignmentId}`).then((r) => r.data);

export const getGrades = (courseId, assignmentId) =>
  client.get(`/courses/${courseId}/assignments/${assignmentId}/grades`).then((r) => r.data);

export const upsertGrade = (courseId, assignmentId, userId, data) =>
  client.put(`/courses/${courseId}/assignments/${assignmentId}/grades/${userId}`, data).then((r) => r.data);

// Content items
export const getContentItems = (courseId, moduleId) =>
  client.get(`/courses/${courseId}/modules/${moduleId}/content`).then((r) => r.data);

export const createContentItem = (courseId, moduleId, data) =>
  client.post(`/courses/${courseId}/modules/${moduleId}/content`, data).then((r) => r.data);

export const updateContentItem = (courseId, moduleId, itemId, data) =>
  client.put(`/courses/${courseId}/modules/${moduleId}/content/${itemId}`, data).then((r) => r.data);

export const deleteContentItem = (courseId, moduleId, itemId) =>
  client.delete(`/courses/${courseId}/modules/${moduleId}/content/${itemId}`).then((r) => r.data);

// Submissions
export const getSubmissions = (courseId, assignmentId) =>
  client.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`).then((r) => r.data);

export const getMySubmission = (courseId, assignmentId) =>
  client.get(`/courses/${courseId}/assignments/${assignmentId}/submissions/mine`).then((r) => r.data);

export const submitAssignment = (courseId, assignmentId, content) =>
  client.post(`/courses/${courseId}/assignments/${assignmentId}/submit`, { content }).then((r) => r.data);

export const updateProgress = (courseId, assignmentId, progress) =>
  client.put(`/courses/${courseId}/assignments/${assignmentId}/progress`, { progress }).then((r) => r.data);

export const getProgress = (courseId, assignmentId) =>
  client.get(`/courses/${courseId}/assignments/${assignmentId}/progress`).then((r) => r.data);

export const unlockAssignment = (courseId, assignmentId, cohortId) =>
  client.post(`/courses/${courseId}/assignments/${assignmentId}/unlock`, { cohort_id: cohortId }).then((r) => r.data);

export const lockAssignment = (courseId, assignmentId, cohortId) =>
  client.post(`/courses/${courseId}/assignments/${assignmentId}/lock`, { cohort_id: cohortId }).then((r) => r.data);

export const gradeSquad = (courseId, assignmentId, squadId, data) =>
  client.put(`/courses/${courseId}/assignments/${assignmentId}/grades/squad/${squadId}`, data).then((r) => r.data);
