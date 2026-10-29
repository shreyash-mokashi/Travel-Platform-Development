import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { RegisterForm } from '@/components/auth/AuthForms';
import { Logo } from '@/components/Logo';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Create an account' };

export default async function RegisterPage({
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
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <Logo className="justify-center" />
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">Create your account</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            You need an account to hold a room and complete a demo booking.
          </p>
        </div>

        <div className="vg-card p-6">
          <RegisterForm returnTo={safeReturnTo} />
        </div>

        <p className="mt-4 text-center text-xs text-ink-muted">
          Voyago is a portfolio project. Please use a throwaway email address — do not enter real
          personal data.
        </p>
      </div>
    </div>
  );
}
