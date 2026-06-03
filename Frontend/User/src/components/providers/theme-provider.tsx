'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useThemeStore } from '@/stores/useThemeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setMounted } = useThemeStore();

  useEffect(() => {
    setMounted();
  }, [setMounted]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [theme]);

  return <>{children}</>;
}
