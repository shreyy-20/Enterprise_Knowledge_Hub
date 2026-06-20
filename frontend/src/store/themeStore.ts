import { create } from 'zustand';

interface ThemeStore {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: (localStorage.getItem('theme-mode') as 'light' | 'dark') || 'dark',
  toggleTheme: () =>
    set((state) => {
      const newMode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme-mode', newMode);
      return { mode: newMode };
    }),
}));
