import { cn } from './cn';

/**
 * Shown wherever a visitor could otherwise mistake this for a live booking
 * service. Required on every pricing, payment and inventory surface.
 */
export function DemoNotice({
  variant = 'inline',
  className,
  children,
}: {
  variant?: 'inline' | 'banner';
  className?: string;
  children?: React.ReactNode;
}) {
  const text =
    children ??
    'Demo inventory — prices and availability are seeded sample data, not live supplier rates.';

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-3 text-sm text-ink',
          className,
        )}
      >
        <span className="font-semibold">Demo only. </span>
        {text}
      </div>
    );
  }

  return <p className={cn('text-xs text-ink-muted', className)}>{text}</p>;
}
