import 'server-only';
import { cookies } from 'next/headers';
import { API_INTERNAL_URL, API_TIMEOUT_MS, ACCESS_TOKEN_COOKIE } from './config';
import { ApiError } from './api-error';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Attach the signed-in user's access token. Defaults to true. */
  auth?: boolean;
  /** Next.js fetch cache behaviour; defaults to no-store for live data. */
  revalidate?: number | false;
}

/**
 * Server-side API client. The access token lives in an httpOnly cookie and is
 * forwarded as a bearer token here, so it is never exposed to browser script.
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, auth = true, revalidate, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  requestHeaders.set('Accept', 'application/json');

  if (auth) {
    const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_INTERNAL_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      ...(revalidate === undefined
        ? { cache: 'no-store' as const }
        : revalidate === false
          ? { cache: 'no-store' as const }
          : { next: { revalidate } }),
    });
  } catch {
    // A timeout or refused connection almost always means the API is asleep or
    // restarting, which is normal on a free hosting tier. Say so plainly
    // instead of surfacing a generic network error.
    throw new ApiError(
      503,
      {
        message:
          'The booking service is waking up. This can take up to a minute on the free ' +
          'demo hosting - please try again in a moment.',
      },
      'The booking service is unavailable.',
    );
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? safeJson(text) : {};

  if (!response.ok) {
    throw new ApiError(response.status, payload, `Request failed (${response.status})`);
  }

  return payload as T;
}

function safeJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text.slice(0, 200) };
  }
}

/** Returns null instead of throwing when the resource is missing or forbidden. */
export async function apiFetchOrNull<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T | null> {
  try {
    return await apiFetch<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return null;
    throw error;
  }
}
