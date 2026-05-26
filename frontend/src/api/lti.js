import client from './client.js';

export const getPlatforms = () =>
  client.get('/lti').then((r) => r.data);

export const createPlatform = (data) =>
  client.post('/lti', data).then((r) => r.data);

export const updatePlatform = (id, data) =>
  client.put(`/lti/${id}`, data).then((r) => r.data);

export const deletePlatform = (id) =>
  client.delete(`/lti/${id}`).then((r) => r.data);
