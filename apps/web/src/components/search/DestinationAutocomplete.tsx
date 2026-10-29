'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Destination } from '@voyago/shared';

/**
 * Accessible combobox over the seeded destination list. The full list is small
 * enough to filter in the browser, so there is no request per keystroke.
 */
export function DestinationAutocomplete({
  destinations,
  defaultValue = '',
  error,
}: {
  destinations: Destination[];
  defaultValue?: string;
  error?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState(() => labelFor(destinations, defaultValue));
  const [slug, setSlug] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return destinations.slice(0, 8);
    return destinations
      .filter(
        (item) =>
          item.city.toLowerCase().includes(needle) ||
          item.state.toLowerCase().includes(needle) ||
          item.slug.includes(needle),
      )
      .slice(0, 8);
  }, [destinations, query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const choose = (destination: Destination) => {
    setQuery(`${destination.city}, ${destination.state}`);
    setSlug(destination.slug);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      const match = matches[activeIndex];
      if (match) choose(match);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={`${listId}-input`} className="vg-label">
        Destination
      </label>
      <input
        id={`${listId}-input`}
        name="destinationLabel"
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${listId}-error` : undefined}
        placeholder="City or area"
        className={`vg-input mt-1.5 ${error ? 'vg-input-error' : ''}`}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setSlug('');
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        data-testid="destination-input"
      />
      {/* The slug is what the API actually receives. */}
      <input type="hidden" name="destination" value={slug || query.trim()} />

      {error ? (
        <p id={`${listId}-error`} className="mt-1 text-xs font-medium text-coral-700">
          {error}
        </p>
      ) : null}

      {open && matches.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Destination suggestions"
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-auto rounded-xl border border-sand-300 bg-white py-1.5 shadow-lift"
        >
          {matches.map((destination, index) => (
            <li
              key={destination.id}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
            >
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(destination)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${
                  index === activeIndex ? 'bg-brand-50' : ''
                }`}
                data-testid={`destination-option-${destination.slug}`}
              >
                <span>
                  <span className="font-semibold text-ink">{destination.city}</span>
                  <span className="text-ink-muted">, {destination.state}</span>
                </span>
                {destination.hotelCount !== undefined ? (
                  <span className="shrink-0 text-xs text-ink-muted">
                    {destination.hotelCount} hotels
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function labelFor(destinations: Destination[], slug: string): string {
  const match = destinations.find((item) => item.slug === slug);
  return match ? `${match.city}, ${match.state}` : slug;
}
