import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="vg-container flex flex-col items-center gap-4 py-24 text-center">
      <p className="font-display text-6xl font-bold text-brand-600">404</p>
      <h1 className="font-display text-2xl text-ink">We could not find that page</h1>
      <p className="max-w-md text-sm text-ink-muted">
        The link may be out of date, or the page may have moved. Start a new hotel search instead.
      </p>
      <ButtonLink href="/" className="mt-2">
        Back to hotel search
      </ButtonLink>
    </div>
  );
}
