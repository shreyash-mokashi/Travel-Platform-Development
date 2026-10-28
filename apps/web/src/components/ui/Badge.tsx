import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sand-200 text-ink-soft',
  success: 'bg-brand-100 text-brand-800',
  warning: 'bg-amber-400/20 text-amber-500',
  danger: 'bg-coral-100 text-coral-800',
  info: 'bg-brand-50 text-brand-700 border border-brand-200',
  accent: 'bg-coral-500 text-white',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
