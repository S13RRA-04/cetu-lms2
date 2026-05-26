import client from './client.js';

export const getUsers = (params) =>
  client.get('/users', { params }).then((r) => r.data);

export const getUser = (id) =>
  client.get(`/users/${id}`).then((r) => r.data);

export const createUser = (data) =>
  client.post('/users', data).then((r) => r.data);

export const updateUser = (id, data) =>
  client.put(`/users/${id}`, data).then((r) => r.data);

export const deleteUser = (id) =>
  client.delete(`/users/${id}`).then((r) => r.data);

export const changePassword = (id, data) =>
  client.put(`/users/${id}/password`, data).then((r) => r.data);
