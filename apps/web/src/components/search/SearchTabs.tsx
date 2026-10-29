'use client';

import { useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';

const TABS = [
  { key: 'hotels', label: 'Hotels', icon: '🏨' },
  { key: 'flights', label: 'Flights', icon: '✈️' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/**
 * Product switcher for the home hero. Both widgets are server-rendered and
 * passed in as children; this component only swaps which one is visible.
 */
export function SearchTabs({
  hotels,
  flights,
  initial = 'hotels',
}: {
  hotels: ReactNode;
  flights: ReactNode;
  initial?: TabKey;
}) {
  const [active, setActive] = useState<TabKey>(initial);

  return (
    <div>
      <div role="tablist" aria-label="What are you booking?" className="mb-3 flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            id={`search-tab-${tab.key}`}
            aria-selected={active === tab.key}
            aria-controls={`search-panel-${tab.key}`}
            onClick={() => setActive(tab.key)}
            data-testid={`search-tab-${tab.key}`}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              active === tab.key
                ? 'bg-white text-brand-700 shadow-sm'
                : 'bg-white/20 text-white hover:bg-white/30',
            )}
          >
            <span aria-hidden className="mr-1.5">
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="search-panel-hotels"
        aria-labelledby="search-tab-hotels"
        hidden={active !== 'hotels'}
      >
        {hotels}
      </div>
      <div
        role="tabpanel"
        id="search-panel-flights"
        aria-labelledby="search-tab-flights"
        hidden={active !== 'flights'}
      >
        {flights}
      </div>
    </div>
  );
}
