import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * In development, force no caching on all responses so the browser never keeps
 * an HTML shell that references stale `/_next/static/*` chunk hashes after
 * `next dev` restarts or `.next` rebuilds (which otherwise shows as 404 + blank UI).
 *
 * Next.js 16+: `middleware` was renamed to `proxy` (same runtime behavior).
 */
export function proxy(_request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.next();
  }
  const res = NextResponse.next();
  res.headers.set('Cache-Control', 'no-store, must-revalidate, max-age=0');
  return res;
}

// Do not run on Next static chunks (official pattern) — avoids edge interaction
// with dev asset serving; HTML routes still get no-store from next.config.mjs headers.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
