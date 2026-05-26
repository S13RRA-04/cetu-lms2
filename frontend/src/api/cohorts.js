import api from './client';

export const listCohorts    = (courseId)           => api.get(`/courses/${courseId}/cohorts`);
export const getCohort      = (courseId, cohortId)  => api.get(`/courses/${courseId}/cohorts/${cohortId}`);
export const createCohort   = (courseId, data)      => api.post(`/courses/${courseId}/cohorts`, data);
export const updateCohort   = (courseId, cohortId, data) => api.put(`/courses/${courseId}/cohorts/${cohortId}`, data);
export const deleteCohort   = (courseId, cohortId)  => api.delete(`/courses/${courseId}/cohorts/${cohortId}`);
export const addMember      = (courseId, cohortId, userId) => api.post(`/courses/${courseId}/cohorts/${cohortId}/members`, { user_id: userId });
export const removeMember   = (courseId, cohortId, userId) => api.delete(`/courses/${courseId}/cohorts/${cohortId}/members/${userId}`);
