import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/auth/AuthForms';
import { Logo } from '@/components/Logo';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith('/') ? returnTo : '/bookings';

  const user = await getCurrentUser();
  if (user) redirect(safeReturnTo);

  return (
    <div className="vg-container flex justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Logo className="justify-center" />
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">Welcome back</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Sign in to manage your bookings and complete checkout.
          </p>
        </div>

        <div className="vg-card p-6">
          <LoginForm returnTo={safeReturnTo} />
        </div>

        <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm">
          <p className="font-semibold text-brand-900">Demo accounts</p>
          <p className="mt-1.5 text-xs leading-relaxed text-brand-800">
            This is a local demonstration. Seeded demo credentials are printed by the database seed
            command (<code className="font-mono">pnpm db:seed</code>) and are documented in the
            project README — they are deliberately not shown on this page.
          </p>
        </div>
      </div>
    </div>
  );
}
