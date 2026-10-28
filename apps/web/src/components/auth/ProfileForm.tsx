'use client';

import { useActionState } from 'react';
import type { AuthUser } from '@voyago/shared';
import { updateProfileAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

export function ProfileForm({ user }: { user: AuthUser }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4" data-testid="profile-form">
      {state.message ? <Alert tone={state.ok ? 'success' : 'error'}>{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-firstName" className="vg-label">
            First name
          </label>
          <input
            id="profile-firstName"
            name="firstName"
            required
            maxLength={60}
            defaultValue={user.firstName}
            className="vg-input mt-1.5"
            data-testid="profile-first-name"
          />
        </div>
        <div>
          <label htmlFor="profile-lastName" className="vg-label">
            Last name
          </label>
          <input
            id="profile-lastName"
            name="lastName"
            required
            maxLength={60}
            defaultValue={user.lastName}
            className="vg-input mt-1.5"
          />
        </div>
      </div>

      <div>
        <label htmlFor="profile-phone" className="vg-label">
          Phone number
        </label>
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          pattern="^\+?[0-9][0-9\s-]{7,16}$"
          defaultValue={user.phone ?? ''}
          placeholder="+91 98200 12345"
          className="vg-input mt-1.5"
        />
      </div>

      <div>
        <span className="vg-label">Email address</span>
        <input value={user.email} disabled className="vg-input mt-1.5" aria-label="Email address" />
        <p className="mt-1 text-xs text-ink-faint">
          The email on your account cannot be changed in this demo.
        </p>
      </div>

      <Button type="submit" disabled={pending} data-testid="profile-save">
        {pending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
