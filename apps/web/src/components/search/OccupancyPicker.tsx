'use client';

import { useEffect, useRef, useState } from 'react';
import { SEARCH_LIMITS } from '@voyago/shared';

interface Occupancy {
  rooms: number;
  adults: number;
  children: number;
}

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  testId,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  testId: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand-300 text-lg leading-none text-ink-soft transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-40"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold tabular-nums" data-testid={testId}>
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand-300 text-lg leading-none text-ink-soft transition hover:border-brand-500 hover:text-brand-600 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function OccupancyPicker({ defaultValue }: { defaultValue: Occupancy }) {
  const [value, setValue] = useState<Occupancy>(defaultValue);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // Shrinking the room count must not leave occupancy above the new ceiling.
  const setRooms = (rooms: number) => {
    setValue((current) => ({
      rooms,
      adults: Math.min(current.adults, rooms * SEARCH_LIMITS.MAX_ADULTS_PER_ROOM),
      children: Math.min(current.children, rooms * SEARCH_LIMITS.MAX_CHILDREN_PER_ROOM),
    }));
  };

  const summary = `${value.rooms} room${value.rooms > 1 ? 's' : ''} · ${value.adults} adult${
    value.adults > 1 ? 's' : ''
  }${value.children > 0 ? ` · ${value.children} child${value.children > 1 ? 'ren' : ''}` : ''}`;

  return (
    <div ref={containerRef} className="relative">
      <span className="vg-label">Rooms &amp; guests</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="vg-input mt-1.5 flex items-center justify-between text-left"
        data-testid="occupancy-trigger"
      >
        <span className="truncate">{summary}</span>
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-ink-muted"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.5 7.5L10 12l4.5-4.5z" />
        </svg>
      </button>

      <input type="hidden" name="rooms" value={value.rooms} />
      <input type="hidden" name="adults" value={value.adults} />
      <input type="hidden" name="children" value={value.children} />

      {open ? (
        <div
          role="dialog"
          aria-label="Choose rooms and guests"
          className="absolute right-0 top-full z-30 mt-1.5 w-72 divide-y divide-sand-200 rounded-xl border border-sand-300 bg-white px-4 py-1 shadow-lift"
        >
          <Stepper
            label="Rooms"
            hint={`Up to ${SEARCH_LIMITS.MAX_ROOMS}`}
            value={value.rooms}
            min={1}
            max={SEARCH_LIMITS.MAX_ROOMS}
            onChange={setRooms}
            testId="occupancy-rooms"
          />
          <Stepper
            label="Adults"
            hint="Age 18 and over"
            value={value.adults}
            min={1}
            max={value.rooms * SEARCH_LIMITS.MAX_ADULTS_PER_ROOM}
            onChange={(adults) => setValue((current) => ({ ...current, adults }))}
            testId="occupancy-adults"
          />
          <Stepper
            label="Children"
            hint={`Age 0 to ${SEARCH_LIMITS.MAX_CHILD_AGE}`}
            value={value.children}
            min={0}
            max={value.rooms * SEARCH_LIMITS.MAX_CHILDREN_PER_ROOM}
            onChange={(children) => setValue((current) => ({ ...current, children }))}
            testId="occupancy-children"
          />
          <div className="py-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-sand-200 py-2 text-sm font-semibold text-ink-soft hover:bg-sand-300"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
