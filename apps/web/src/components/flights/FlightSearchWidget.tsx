'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FLIGHT_SEARCH_LIMITS, addDays, todayIso, type AirportView } from '@voyago/shared';
import { Button } from '../ui/Button';

interface Defaults {
  from?: string;
  to?: string;
  date?: string;
  adults?: number;
  children?: number;
}

/**
 * One-way flight search. Origin and destination come from the six demo
 * airports; the date input is bounded the same way the API validates it.
 */
export function FlightSearchWidget({
  airports,
  defaults,
  compact = false,
}: {
  airports: AirportView[];
  defaults?: Defaults;
  compact?: boolean;
}) {
  const router = useRouter();
  const tomorrow = addDays(todayIso(), 1);

  const [from, setFrom] = useState(defaults?.from ?? 'BOM');
  const [to, setTo] = useState(defaults?.to ?? 'GOI');
  const [date, setDate] = useState(defaults?.date ?? addDays(todayIso(), 14));
  const [adults, setAdults] = useState(defaults?.adults ?? 1);
  const [children, setChildren] = useState(defaults?.children ?? 0);
  const [error, setError] = useState<string | null>(null);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (from === to) {
      setError('Pick two different airports.');
      return;
    }
    if (adults + children > FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS) {
      setError(`At most ${FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS} travellers per booking.`);
      return;
    }
    setError(null);
    const params = new URLSearchParams({
      from,
      to,
      date,
      adults: String(adults),
      children: String(children),
    });
    router.push(`/flights?${params.toString()}`);
  };

  const airportLabel = (airport: AirportView) => `${airport.city} (${airport.iata})`;

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? 'vg-card p-4' : 'vg-card p-4 sm:p-5'}
      data-testid="flight-search-widget"
      aria-label="Search flights"
    >
      <div className="grid gap-3 md:grid-cols-12 md:items-end">
        <div className="md:col-span-3">
          <label htmlFor="flight-from" className="vg-label">
            From
          </label>
          <select
            id="flight-from"
            name="from"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="vg-input mt-1.5"
          >
            {airports.map((airport) => (
              <option key={airport.iata} value={airport.iata}>
                {airportLabel(airport)}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden justify-center pb-1.5 md:col-span-1 md:flex">
          <button
            type="button"
            onClick={swap}
            aria-label="Swap origin and destination"
            className="rounded-full border border-sand-300 p-2 text-ink-muted transition hover:border-brand-400 hover:text-brand-700"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden>
              <path d="M13.5 3 17 6.5l-3.5 3.5-1.06-1.06L14.1 7.25H3v-1.5h11.1l-1.66-1.69L13.5 3ZM6.5 17 3 13.5 6.5 10l1.06 1.06-1.66 1.69H17v1.5H5.9l1.66 1.69L6.5 17Z" />
            </svg>
          </button>
        </div>

        <div className="md:col-span-3">
          <label htmlFor="flight-to" className="vg-label">
            To
          </label>
          <select
            id="flight-to"
            name="to"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="vg-input mt-1.5"
          >
            {airports.map((airport) => (
              <option key={airport.iata} value={airport.iata}>
                {airportLabel(airport)}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="flight-date" className="vg-label">
            Departure
          </label>
          <input
            id="flight-date"
            name="date"
            type="date"
            required
            min={tomorrow}
            max={addDays(todayIso(), FLIGHT_SEARCH_LIMITS.MAX_ADVANCE_DAYS)}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="vg-input mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-2">
          <div>
            <label htmlFor="flight-adults" className="vg-label">
              Adults
            </label>
            <select
              id="flight-adults"
              name="adults"
              value={adults}
              onChange={(event) => setAdults(Number(event.target.value))}
              className="vg-input mt-1.5"
            >
              {Array.from({ length: FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="flight-children" className="vg-label">
              Children
            </label>
            <select
              id="flight-children"
              name="children"
              value={children}
              onChange={(event) => setChildren(Number(event.target.value))}
              className="vg-input mt-1.5"
            >
              {Array.from({ length: FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS }, (_, index) => (
                <option key={index} value={index}>
                  {index}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="md:col-span-1">
          <Button type="submit" fullWidth data-testid="flight-search-submit">
            Search
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
