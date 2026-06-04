import client from './client.js';

const BASE = '/kcr';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const logout = () =>
  client.post('/auth/logout', {}, { withCredentials: true });

// ── Environments ──────────────────────────────────────────────────────────────
export const listEnvironments = () =>
  client.get(BASE).then((r) => r.data);

export const createEnvironment = (data) =>
  client.post(BASE, data).then((r) => r.data);

export const updateEnvironment = (eid, data) =>
  client.put(`${BASE}/${eid}`, data).then((r) => r.data);

export const deleteEnvironment = (eid) =>
  client.delete(`${BASE}/${eid}`);

// ── Venues ────────────────────────────────────────────────────────────────────
export const listVenues = (eid) =>
  client.get(`${BASE}/${eid}/venues`).then((r) => r.data);

export const createVenue = (eid, data) =>
  client.post(`${BASE}/${eid}/venues`, data).then((r) => r.data);

export const updateVenue = (eid, vid, data) =>
  client.put(`${BASE}/${eid}/venues/${vid}`, data).then((r) => r.data);

export const deleteVenue = (eid, vid) =>
  client.delete(`${BASE}/${eid}/venues/${vid}`);

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const listRooms = (eid, vid) =>
  client.get(`${BASE}/${eid}/venues/${vid}/rooms`).then((r) => r.data);

export const createRoom = (eid, vid, data) =>
  client.post(`${BASE}/${eid}/venues/${vid}/rooms`, data).then((r) => r.data);

export const updateRoom = (eid, vid, rid, data) =>
  client.put(`${BASE}/${eid}/venues/${vid}/rooms/${rid}`, data).then((r) => r.data);

export const deleteRoom = (eid, vid, rid) =>
  client.delete(`${BASE}/${eid}/venues/${vid}/rooms/${rid}`);

// ── Floor plan ────────────────────────────────────────────────────────────────
export const presignFloorPlan = (eid, vid, rid, contentType) =>
  client.post(`${BASE}/${eid}/venues/${vid}/rooms/${rid}/floor-plan/presign`, { content_type: contentType }).then((r) => r.data);

export const confirmFloorPlan = (eid, vid, rid, key) =>
  client.post(`${BASE}/${eid}/venues/${vid}/rooms/${rid}/floor-plan/confirm`, { key }).then((r) => r.data);

export const getFloorPlanUrl = (eid, vid, rid) =>
  client.get(`${BASE}/${eid}/venues/${vid}/rooms/${rid}/floor-plan`).then((r) => r.data);

// ── Artifacts ─────────────────────────────────────────────────────────────────
export const listArtifacts = (eid) =>
  client.get(`${BASE}/${eid}/artifacts`).then((r) => r.data);

export const createArtifact = (eid, data) =>
  client.post(`${BASE}/${eid}/artifacts`, data).then((r) => r.data);

export const updateArtifact = (eid, aid, data) =>
  client.put(`${BASE}/${eid}/artifacts/${aid}`, data).then((r) => r.data);

export const deleteArtifact = (eid, aid) =>
  client.delete(`${BASE}/${eid}/artifacts/${aid}`);

// ── Placements ────────────────────────────────────────────────────────────────
export const listPlacements = (eid, vid, rid) =>
  client.get(`${BASE}/${eid}/venues/${vid}/rooms/${rid}/placements`).then((r) => r.data);

export const createPlacement = (eid, vid, rid, data) =>
  client.post(`${BASE}/${eid}/venues/${vid}/rooms/${rid}/placements`, data).then((r) => r.data);

export const updatePlacement = (eid, vid, rid, pid, data) =>
  client.put(`${BASE}/${eid}/venues/${vid}/rooms/${rid}/placements/${pid}`, data).then((r) => r.data);

export const deletePlacement = (eid, vid, rid, pid) =>
  client.delete(`${BASE}/${eid}/venues/${vid}/rooms/${rid}/placements/${pid}`);
