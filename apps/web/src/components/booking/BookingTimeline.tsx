import { BOOKING_STATUS_LABEL, type BookingStatusEventView } from '@voyago/shared';

export function BookingTimeline({ events }: { events: BookingStatusEventView[] }) {
  if (events.length === 0) return null;

  return (
    <ol className="space-y-4" data-testid="booking-timeline">
      {events.map((event, index) => (
        <li key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                index === events.length - 1 ? 'bg-brand-600' : 'bg-sand-300'
              }`}
              aria-hidden
            />
            {index < events.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-sand-300" aria-hidden />
            ) : null}
          </div>
          <div className="pb-1">
            <p className="text-sm font-semibold text-ink">{BOOKING_STATUS_LABEL[event.toStatus]}</p>
            {event.note ? (
              <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{event.note}</p>
            ) : null}
            <p className="mt-0.5 text-xs text-ink-faint">
              {new Date(event.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
