import { create } from 'zustand';

const stored = () => {
  try {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
};

const useAuthStore = create((set) => ({
  user: stored(),
  setUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
    }
    set({ user });
  },
}));

export default useAuthStore;
