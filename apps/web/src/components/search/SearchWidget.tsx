'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { SEARCH_LIMITS, addDays, nightsBetween, todayIso } from '@voyago/shared';
import type { Destination } from '@voyago/shared';
import { Button } from '../ui/Button';
import { DestinationAutocomplete } from './DestinationAutocomplete';
import { OccupancyPicker } from './OccupancyPicker';

interface Defaults {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
}

type Errors = Partial<Record<'destination' | 'checkIn' | 'checkOut', string>>;

/**
 * The hotel search form. Validation runs in the browser for immediate feedback;
 * the API validates the same rules again on every request.
 */
export function SearchWidget({
  destinations,
  defaults,
  variant = 'hero',
}: {
  destinations: Destination[];
  defaults: Defaults;
  variant?: 'hero' | 'compact';
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Errors>({});
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [submitting, setSubmitting] = useState(false);

  const today = todayIso();
  const maxDate = addDays(today, SEARCH_LIMITS.MAX_ADVANCE_DAYS);

  const onCheckInChange = (value: string) => {
    setCheckIn(value);
    // Keep the stay valid as the user edits: push check-out along if needed.
    if (value && checkOut <= value) setCheckOut(addDays(value, 1));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const destination = String(formData.get('destination') ?? '').trim();

    const nextErrors: Errors = {};
    if (!destination) nextErrors.destination = 'Choose where you want to stay.';
    if (!checkIn) nextErrors.checkIn = 'Choose a check-in date.';
    else if (checkIn < today) nextErrors.checkIn = 'Check-in cannot be in the past.';
    if (!checkOut) nextErrors.checkOut = 'Choose a check-out date.';
    else if (checkIn && nightsBetween(checkIn, checkOut) < 1) {
      nextErrors.checkOut = 'Check-out must be after check-in.';
    } else if (checkIn && nightsBetween(checkIn, checkOut) > SEARCH_LIMITS.MAX_NIGHTS) {
      nextErrors.checkOut = `Stays are limited to ${SEARCH_LIMITS.MAX_NIGHTS} nights.`;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const query = new URLSearchParams({
      destination,
      checkIn,
      checkOut,
      rooms: String(formData.get('rooms') ?? 1),
      adults: String(formData.get('adults') ?? 2),
      children: String(formData.get('children') ?? 0),
    });
    router.push(`/hotels?${query.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      data-testid="search-widget"
      className={variant === 'hero' ? 'rounded-2xl bg-white p-4 shadow-lift sm:p-5' : 'vg-card p-4'}
    >
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-4">
          <DestinationAutocomplete
            destinations={destinations}
            defaultValue={defaults.destination}
            error={errors.destination}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="checkIn" className="vg-label">
            Check-in
          </label>
          <input
            id="checkIn"
            name="checkIn"
            type="date"
            value={checkIn}
            min={today}
            max={maxDate}
            onChange={(event) => onCheckInChange(event.target.value)}
            aria-invalid={errors.checkIn ? true : undefined}
            aria-describedby={errors.checkIn ? 'checkIn-error' : undefined}
            className={`vg-input mt-1.5 ${errors.checkIn ? 'vg-input-error' : ''}`}
            data-testid="checkin-input"
          />
          {errors.checkIn ? (
            <p id="checkIn-error" className="mt-1 text-xs font-medium text-coral-700">
              {errors.checkIn}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <label htmlFor="checkOut" className="vg-label">
            Check-out
          </label>
          <input
            id="checkOut"
            name="checkOut"
            type="date"
            value={checkOut}
            min={checkIn ? addDays(checkIn, 1) : addDays(today, 1)}
            max={addDays(maxDate, SEARCH_LIMITS.MAX_NIGHTS)}
            onChange={(event) => setCheckOut(event.target.value)}
            aria-invalid={errors.checkOut ? true : undefined}
            aria-describedby={errors.checkOut ? 'checkOut-error' : undefined}
            className={`vg-input mt-1.5 ${errors.checkOut ? 'vg-input-error' : ''}`}
            data-testid="checkout-input"
          />
          {errors.checkOut ? (
            <p id="checkOut-error" className="mt-1 text-xs font-medium text-coral-700">
              {errors.checkOut}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2">
          <OccupancyPicker
            defaultValue={{
              rooms: defaults.rooms,
              adults: defaults.adults,
              children: defaults.children,
            }}
          />
        </div>

        <div className="flex items-end md:col-span-2">
          <Button
            type="submit"
            size="lg"
            fullWidth
            disabled={submitting}
            data-testid="search-submit"
          >
            {submitting ? 'Searching…' : 'Search hotels'}
          </Button>
        </div>
      </div>
    </form>
  );
}
