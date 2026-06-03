import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const noopStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

interface ThemeState {
  theme: 'dark' | 'light';
  isMounted: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setMounted: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      isMounted: false,
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),
      setTheme: (theme) => set({ theme }),
      setMounted: () => set({ isMounted: true }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : (noopStorage as Storage)
      ),
    }
  )
);
