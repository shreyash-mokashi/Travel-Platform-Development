import { cn } from './ui/cn';

/**
 * Voyago wordmark: a compass needle inside a rounded square, set against the
 * brand teal. Original artwork for this project.
 */
export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl shadow-sm',
          inverted ? 'bg-white' : 'bg-brand-600',
        )}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <circle
            cx="12"
            cy="12"
            r="9"
            className={inverted ? 'stroke-brand-600' : 'stroke-white'}
            strokeWidth="1.6"
            fill="none"
          />
          <path
            d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"
            className={inverted ? 'fill-coral-500' : 'fill-coral-400'}
          />
        </svg>
      </span>
      <span
        className={cn(
          'font-display text-xl font-bold tracking-tight',
          inverted ? 'text-white' : 'text-ink',
        )}
      >
        Voyago
      </span>
    </span>
  );
}
