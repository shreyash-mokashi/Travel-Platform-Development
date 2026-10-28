import type { ApiErrorBody } from '@voyago/shared';

/** Carries the API's error envelope so UI can show its message verbatim. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: Partial<ApiErrorBody>;

  constructor(status: number, body: Partial<ApiErrorBody>, fallback: string) {
    super(body.message || fallback);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** Field-level validation messages, when the API returned any. */
  get details(): string[] {
    return Array.isArray(this.body.details) ? (this.body.details as string[]) : [];
  }

  get isAuthError(): boolean {
    return this.status === 401;
  }
}

export function toUserMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
