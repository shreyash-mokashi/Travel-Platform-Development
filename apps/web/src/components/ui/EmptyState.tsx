import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon = '🧭',
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="vg-card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="max-w-md text-sm text-ink-muted">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
