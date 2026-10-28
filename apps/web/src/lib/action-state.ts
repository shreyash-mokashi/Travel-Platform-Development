/**
 * Shared shape for server-action results. This lives outside the 'use server'
 * modules because such a file may only export async functions.
 */
export interface ActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
}

export const emptyActionState: ActionState = { ok: false };
