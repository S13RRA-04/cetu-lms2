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

export const updateProgress = (assignmentId, progress, quizState = null) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/progress`, { progress, quiz_state: quizState }).then((r) => r.data);

/* ── Grades ── */
export const getMyGrades = () =>
  client.get(`/courses/${COURSE_ID}/grades/me`).then((r) => r.data);

/* ── Scoreboard ── */
export const getScoreboard      = () =>
  client.get(`/courses/${COURSE_ID}/scoreboard`).then((r) => r.data);
export const getSquadScoreboard = () =>
  client.get(`/courses/${COURSE_ID}/squad-scoreboard`).then((r) => r.data);

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

export const submitSquadGrade = (assignmentId, squadId, data) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/grades/squad/${squadId}`, data).then((r) => r.data);

/* ── Squad-shared challenge state ── */
export const getSquadChallengeState = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/squad-state`).then((r) => r.data);

export const saveSquadChallengeState = (assignmentId, state) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}/squad-state`, state).then((r) => r.data);

/* ── Live progress ── */
export const getLiveOverview = () =>
  client.get(`/courses/${COURSE_ID}/live-progress`).then((r) => r.data);

export const getAssignmentProgress = (assignmentId) =>
  client.get(`/courses/${COURSE_ID}/assignments/${assignmentId}/progress`).then((r) => r.data);

/* ── Cohorts ── */
export const getCohorts = () =>
  client.get(`/courses/${COURSE_ID}/cohorts`).then((r) => {
    const raw = r.data;
    return Array.isArray(raw) ? raw : (raw.data ?? []);
  });

export const updateCohort = (cohortId, data) =>
  client.put(`/courses/${COURSE_ID}/cohorts/${cohortId}`, data).then((r) => r.data);

/* ── Squads ── */
export const getSquadsByCohort = (cohortId) =>
  client.get(`/courses/${COURSE_ID}/cohorts/${cohortId}/squads`).then((r) => r.data);

export const updateSquad = (cohortId, squadId, data) =>
  client.put(`/courses/${COURSE_ID}/cohorts/${cohortId}/squads/${squadId}`, data).then((r) => r.data);

/* ── Chat ── */
export const getChatToken = () =>
  client.get(`/courses/${COURSE_ID}/chat/token`).then((r) => r.data);

export const getChatUsers = () =>
  client.get(`/courses/${COURSE_ID}/chat/users`).then((r) => r.data);

export const startChatDM = (userId) =>
  client.post(`/courses/${COURSE_ID}/chat/dm`, { user_id: userId }).then((r) => r.data);

/* ── Scenarios ── */
// `manage: true` is for Command's authoring view only — it includes unpublished
// packages. Every operator-facing page (Case File, etc.) must call this with
// the default so unpublished packages never surface there, even for admins.
export const getScenarios = (manage = false) =>
  client.get(`/courses/${COURSE_ID}/scenarios${manage ? '?manage=1' : ''}`).then((r) => r.data);

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

export const browseScenarioR2 = (prefix) =>
  client.get(`/courses/${COURSE_ID}/scenarios/browse`, { params: { prefix } }).then((r) => r.data);

export const quickReleaseScenario = (data) =>
  client.post(`/courses/${COURSE_ID}/scenarios/quick-release`, data).then((r) => r.data);

export const presignScenarioUpload = (key, contentType) =>
  client.post(`/courses/${COURSE_ID}/scenarios/presign`, { key, content_type: contentType }).then((r) => r.data);

export const deleteScenarioR2Object = (key) =>
  client.delete(`/courses/${COURSE_ID}/scenarios/r2-object`, { data: { key } });

export const updateAssignment = (assignmentId, data) =>
  client.put(`/courses/${COURSE_ID}/assignments/${assignmentId}`, data).then((r) => r.data);

/* ── Assignment gating ── */
export const unlockAssignment = (assignmentId, cohortId, squadId = null) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/unlock`, { cohort_id: cohortId, squad_id: squadId }).then((r) => r.data);

export const lockAssignment = (assignmentId, cohortId, squadId = null) =>
  client.post(`/courses/${COURSE_ID}/assignments/${assignmentId}/lock`, { cohort_id: cohortId, squad_id: squadId }).then((r) => r.data);

/* ── Campaign Drops ── */
export const getCampaignDrops = (cohortId) =>
  client.get(`/courses/${COURSE_ID}/campaign/drops`, { params: { cohort_id: cohortId } }).then((r) => r.data);

export const createCampaignDrop = (data) =>
  client.post(`/courses/${COURSE_ID}/campaign/drops`, data).then((r) => r.data);

export const verifyVaultPin = (dropId, pin) =>
  client.post(`/courses/${COURSE_ID}/campaign/drops/${dropId}/verify-pin`, { pin }).then((r) => r.data);

export const updateCampaignDrop = (dropId, data) =>
  client.put(`/courses/${COURSE_ID}/campaign/drops/${dropId}`, data).then((r) => r.data);

export const deleteCampaignDrop = (dropId) =>
  client.delete(`/courses/${COURSE_ID}/campaign/drops/${dropId}`);

export const releaseCampaignDrop = (dropId, cohortId) =>
  client.post(`/courses/${COURSE_ID}/campaign/drops/${dropId}/release`, { cohort_id: cohortId }).then((r) => r.data);

export const lockCampaignDrop = (dropId, cohortId) =>
  client.post(`/courses/${COURSE_ID}/campaign/drops/${dropId}/lock`, { cohort_id: cohortId });

/* ── Course Content ── */
// `manage: true` is for Command's authoring view only — see getScenarios above.
export const getCourseContent = (manage = false) =>
  client.get(`/courses/${COURSE_ID}/course-content${manage ? '?manage=1' : ''}`).then((r) => r.data);

export const getContentDownloadUrl = (contentId) =>
  `${client.defaults.baseURL}/courses/${COURSE_ID}/course-content/${contentId}/download`;

export const createContentLink = (data) =>
  client.post(`/courses/${COURSE_ID}/course-content`, data).then((r) => r.data);

export const syncDecksFromR2 = () =>
  client.post(`/courses/${COURSE_ID}/course-content/sync-decks`).then((r) => r.data);

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

/* ── Intel Board ── */
export const getIntelBoard = () =>
  client.get(`/courses/${COURSE_ID}/intel`).then((r) => r.data).catch((err) => {
    if (err.response?.status === 404) return { noSquad: true };
    throw err;
  });

export const saveIntelBoard = (board) =>
  client.put(`/courses/${COURSE_ID}/intel`, board).then((r) => r.data);
