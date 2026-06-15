import { create } from 'zustand';
import * as authApi from '../api/auth.js';

/* Roles that carry LMS admin privileges. Instructors (Program Managers)
   are intentionally included so they can access all admin features. */
export const ADMIN_ROLES = ['admin', 'superadmin', 'instructor'];
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);

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

  updateUser: (patch) => {
    const updated = { ...get().user, ...patch };
    localStorage.setItem('user', JSON.stringify(updated));
    set({ user: updated });
  },

  logout: async () => {
    try { await authApi.logout(); } catch (_) { /* ignore */ }
    get().clearAuth();
  },
}));

export default useAuthStore;
