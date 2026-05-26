import { create } from 'zustand';
import * as authApi from '../api/auth.js';

function loadUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}

const useAuthStore = create((set, get) => ({
  user:        loadUser(),
  accessToken: localStorage.getItem('accessToken'),

  setAuth: (user, accessToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken });
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null });
  },

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    get().setAuth(data.user, data.accessToken);
    return data.user;
  },

  logout: async () => {
    try { await authApi.logout(); } catch (_) { /* ignore */ }
    get().clearAuth();
  },
}));

export default useAuthStore;
