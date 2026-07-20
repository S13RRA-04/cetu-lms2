import client from './client.js';

export const register = (data) =>
  client.post('/auth/register', data).then((r) => r.data);
