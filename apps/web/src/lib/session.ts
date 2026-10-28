import 'server-only';
import { cookies } from 'next/headers';
import type { AuthResponse, AuthUser } from '@voyago/shared';
import { apiFetch, apiFetchOrNull } from './api';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './config';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Tokens are stored in httpOnly cookies written by server code only. Browser
 * JavaScript can never read them, which removes the usual XSS token-theft path.
 */
export async function writeSession(auth: AuthResponse & { refreshToken: string }): Promise<void> {
  const store = await cookies();
  const shared = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };

  store.set(ACCESS_TOKEN_COOKIE, auth.accessToken, { ...shared, maxAge: auth.expiresIn });
  store.set(REFRESH_TOKEN_COOKIE, auth.refreshToken, { ...shared, maxAge: 60 * 60 * 24 * 7 });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;
}

/** Current user, or null when signed out. Never throws. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  if (!store.get(ACCESS_TOKEN_COOKIE)?.value) return null;
  return apiFetchOrNull<AuthUser>('/auth/me');
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('UNAUTHENTICATED');
  return user;
}

export function loginPathFor(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const auth = await apiFetch<AuthResponse & { refreshToken: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  await writeSession(auth);
  return auth.user;
}

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<AuthUser> {
  const auth = await apiFetch<AuthResponse & { refreshToken: string }>('/auth/register', {
    method: 'POST',
    body: input,
    auth: false,
  });
  await writeSession(auth);
  return auth.user;
}
