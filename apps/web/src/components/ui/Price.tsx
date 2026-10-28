import { formatMoney } from '@voyago/shared';
import { cn } from './cn';

export function Price({
  minor,
  className,
  suffix,
}: {
  minor: number;
  className?: string;
  suffix?: string;
}) {
  return (
    <span className={cn('tabular-nums', className)}>
      {formatMoney(minor)}
      {suffix ? <span className="text-xs font-normal text-ink-muted"> {suffix}</span> : null}
    </span>
  );
}
