import client from './client.js';

export const getMe = () =>
  client.get('/users/me').then((r) => r.data);

export const updateMe = (data) =>
  client.put('/users/me', data).then((r) => r.data);

export const changeMyPassword = (current_password, new_password) =>
  client.put('/users/me/password', { current_password, new_password }).then((r) => r.data);

export const getMyGrades = () =>
  client.get('/users/me/grades').then((r) => r.data);
