import api from './client';

// Cohorts
export const listCohorts    = (courseId)                   => api.get(`/courses/${courseId}/cohorts`).then(r => r.data);
export const getCohort      = (courseId, cohortId)          => api.get(`/courses/${courseId}/cohorts/${cohortId}`).then(r => r.data);
export const createCohort   = (courseId, data)              => api.post(`/courses/${courseId}/cohorts`, data).then(r => r.data);
export const updateCohort   = (courseId, cohortId, data)    => api.put(`/courses/${courseId}/cohorts/${cohortId}`, data).then(r => r.data);
export const deleteCohort   = (courseId, cohortId)          => api.delete(`/courses/${courseId}/cohorts/${cohortId}`);
export const addMember      = (courseId, cohortId, userId)  => api.post(`/courses/${courseId}/cohorts/${cohortId}/members`, { user_id: userId }).then(r => r.data);
export const removeMember   = (courseId, cohortId, userId)  => api.delete(`/courses/${courseId}/cohorts/${cohortId}/members/${userId}`);

// Squads
export const listSquads       = (courseId, cohortId)                    => api.get(`/courses/${courseId}/cohorts/${cohortId}/squads`).then(r => r.data);
export const createSquad      = (courseId, cohortId, data)              => api.post(`/courses/${courseId}/cohorts/${cohortId}/squads`, data).then(r => r.data);
export const updateSquad      = (courseId, cohortId, squadId, data)     => api.put(`/courses/${courseId}/cohorts/${cohortId}/squads/${squadId}`, data).then(r => r.data);
export const deleteSquad      = (courseId, cohortId, squadId)           => api.delete(`/courses/${courseId}/cohorts/${cohortId}/squads/${squadId}`);
export const assignToSquad    = (courseId, cohortId, squadId, userId)   => api.post(`/courses/${courseId}/cohorts/${cohortId}/squads/${squadId}/members`, { user_id: userId }).then(r => r.data);
export const removeFromSquad  = (courseId, cohortId, squadId, userId)   => api.delete(`/courses/${courseId}/cohorts/${cohortId}/squads/${squadId}/members/${userId}`);
