import { cn } from './cn';

export function StarRating({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 text-amber-400', className)}
      aria-label={`${value} star property`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 20 20"
          className={cn('h-3.5 w-3.5', index < value ? 'fill-current' : 'fill-sand-300')}
          aria-hidden
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
}

/** Guest score shown as a solid chip, the way booking sites present it. */
export function GuestScore({
  value,
  reviewCount,
  className,
}: {
  value: number;
  reviewCount?: number;
  className?: string;
}) {
  const label =
    value >= 4.5 ? 'Exceptional' : value >= 4.2 ? 'Excellent' : value >= 3.8 ? 'Very good' : 'Good';
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className="rounded-lg bg-brand-600 px-2 py-1 text-sm font-bold text-white">
        {value.toFixed(1)}
      </span>
      <span className="text-xs text-ink-muted">
        <span className="font-semibold text-ink-soft">{label}</span>
        {reviewCount !== undefined ? ` · ${reviewCount.toLocaleString('en-IN')} reviews` : null}
      </span>
    </span>
  );
}
