/** Base URL used by server components and route handlers. */
export const API_INTERNAL_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Base URL used by browser code (currently only the Next.js proxy routes). */
export const API_PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * How long a server-side API call may take before we give up. Free hosting
 * tiers suspend idle services, so the first request after a quiet period can
 * take tens of seconds while the API wakes.
 */
export const API_TIMEOUT_MS = Number(process.env.API_TIMEOUT_MS) || 25_000;

export const ACCESS_TOKEN_COOKIE = 'voyago_at';
export const REFRESH_TOKEN_COOKIE = 'voyago_rt';
