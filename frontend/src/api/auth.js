import client from './client.js';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const register = (data) =>
  client.post('/auth/register', data).then((r) => r.data);

export const logout = () =>
  client.post('/auth/logout').then((r) => r.data);

export const refresh = () =>
  client.post('/auth/refresh').then((r) => r.data);

export const getLaunchUrl = (target = 'pact') =>
  client.post('/auth/launch-token', { target }).then((r) => r.data.launchUrl);

export const requestPasswordReset = (email) =>
  client.post('/auth/forgot-password', { email }).then((r) => r.data);

export const confirmPasswordReset = (token, newPassword) =>
  client.post('/auth/reset-password', { token, new_password: newPassword }).then((r) => r.data);
