'use client';

import { useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api-base';
import { devLog } from '@/lib/dev-log';

/** Prints app boot info once in development (browser console). */
export function DevConsoleInit() {
  useEffect(() => {
    devLog('App', 'Frontend/User started', {
      apiBase: getApiBaseUrl(),
      env: process.env.NODE_ENV,
    });
  }, []);
  return null;
}
