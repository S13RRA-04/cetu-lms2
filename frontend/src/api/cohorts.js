import api from './client';

// Cohorts
export const listCohorts    = (courseId)                   => api.get(`/courses/${courseId}/cohorts`).then(r => r.data);
export const getCohort      = (courseId, cohortId)          => api.get(`/courses/${courseId}/cohorts/${cohortId}`).then(r => r.data);
export const createCohort   = (courseId, data)              => api.post(`/courses/${courseId}/cohorts`, data).then(r => r.data);
export const updateCohort   = (courseId, cohortId, data)    => api.put(`/courses/${courseId}/cohorts/${cohortId}`, data).then(r => r.data);
export const deleteCohort   = (courseId, cohortId)          => api.delete(`/courses/${courseId}/cohorts/${cohortId}`);
export const addMember      = (courseId, cohortId, userId)  => api.post(`/courses/${courseId}/cohorts/${cohortId}/members`, { user_id: userId }).then(r => r.data);
export const removeMember   = (courseId, cohortId, userId)  => api.delete(`/courses/${courseId}/cohorts/${cohortId}/members/${userId}`);

// Cells
export const listCells      = (courseId, cohortId)                   => api.get(`/courses/${courseId}/cohorts/${cohortId}/cells`).then(r => r.data);
export const createCell     = (courseId, cohortId, data)             => api.post(`/courses/${courseId}/cohorts/${cohortId}/cells`, data).then(r => r.data);
export const updateCell     = (courseId, cohortId, cellId, data)     => api.put(`/courses/${courseId}/cohorts/${cohortId}/cells/${cellId}`, data).then(r => r.data);
export const deleteCell     = (courseId, cohortId, cellId)           => api.delete(`/courses/${courseId}/cohorts/${cohortId}/cells/${cellId}`);
export const assignToCell   = (courseId, cohortId, cellId, userId)   => api.post(`/courses/${courseId}/cohorts/${cohortId}/cells/${cellId}/members`, { user_id: userId }).then(r => r.data);
export const removeFromCell = (courseId, cohortId, cellId, userId)   => api.delete(`/courses/${courseId}/cohorts/${cohortId}/cells/${cellId}/members/${userId}`);
