'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { loginAction, registerAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, formAction, pending] = useActionState(loginAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4" data-testid="login-form">
      <input type="hidden" name="returnTo" value={returnTo} />

      {state.message ? (
        <Alert tone="error" title="Sign-in failed">
          {state.message}
        </Alert>
      ) : null}

      <div>
        <label htmlFor="email" className="vg-label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="vg-input mt-1.5"
          data-testid="login-email"
        />
      </div>

      <div>
        <label htmlFor="password" className="vg-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="vg-input mt-1.5"
          data-testid="login-password"
        />
      </div>

      <Button type="submit" size="lg" fullWidth disabled={pending} data-testid="login-submit">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        New to Voyago?{' '}
        <Link
          href={`/register?returnTo=${encodeURIComponent(returnTo)}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ returnTo }: { returnTo: string }) {
  const [state, formAction, pending] = useActionState(registerAction, emptyActionState);

  return (
    <form action={formAction} className="space-y-4" data-testid="register-form">
      <input type="hidden" name="returnTo" value={returnTo} />

      {state.message ? (
        <Alert tone="error" title="We could not create your account">
          {state.message}
          {state.fieldErrors ? (
            <ul className="mt-1.5 list-inside list-disc text-xs">
              {Object.values(state.fieldErrors).map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="vg-label">
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            maxLength={60}
            autoComplete="given-name"
            className="vg-input mt-1.5"
            data-testid="register-first-name"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="vg-label">
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            maxLength={60}
            autoComplete="family-name"
            className="vg-input mt-1.5"
            data-testid="register-last-name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="reg-email" className="vg-label">
          Email address
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="vg-input mt-1.5"
          data-testid="register-email"
        />
      </div>

      <div>
        <label htmlFor="phone" className="vg-label">
          Phone number (optional)
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          pattern="^\+?[0-9][0-9\s-]{7,16}$"
          placeholder="+91 98200 12345"
          className="vg-input mt-1.5"
          data-testid="register-phone"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-password" className="vg-label">
            Password
          </label>
          <input
            id="reg-password"
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            aria-describedby="password-hint"
            className="vg-input mt-1.5"
            data-testid="register-password"
          />
          <p id="password-hint" className="mt-1 text-xs text-ink-faint">
            At least 10 characters, with a letter and a number.
          </p>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="vg-label">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="vg-input mt-1.5"
            data-testid="register-confirm-password"
          />
        </div>
      </div>

      <Button type="submit" size="lg" fullWidth disabled={pending} data-testid="register-submit">
        {pending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <Link
          href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
          className="font-semibold text-brand-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
