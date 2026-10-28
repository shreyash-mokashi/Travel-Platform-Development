import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import type { Destination } from '@voyago/shared';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { apiFetch } from '@/lib/api';
import { defaultStay } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Destinations',
  description: 'Browse the six Indian cities with seeded Voyago hotel inventory.',
};

export default async function DestinationsPage() {
  const destinations = await apiFetch<Destination[]>('/destinations', { auth: false });
  const stay = defaultStay();

  return (
    <div className="vg-container py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Destinations</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
          Voyago currently carries demo hotel inventory for six Indian cities. Each destination has
          a guide stored in MongoDB alongside its hotels.
        </p>
        <DemoNotice className="mt-2" />
      </header>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((destination) => (
          <li key={destination.id}>
            <Link
              href={`/hotels?destination=${destination.slug}&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=2&children=0`}
              className="vg-card group flex h-full flex-col overflow-hidden transition hover:shadow-lift"
              data-testid={`destination-${destination.slug}`}
            >
              <span className="relative block h-44 overflow-hidden">
                <Image
                  src={destination.heroImageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </span>
              <span className="flex flex-1 flex-col p-5">
                <span className="font-display text-xl font-bold text-ink transition group-hover:text-brand-700">
                  {destination.city}
                </span>
                <span className="mt-0.5 text-xs uppercase tracking-wide text-ink-faint">
                  {destination.state}, {destination.country}
                </span>
                <span className="mt-3 block text-sm leading-relaxed text-ink-soft">
                  {destination.tagline}
                </span>
                <span className="mt-auto pt-4 text-sm font-semibold text-brand-700">
                  {destination.hotelCount} demo hotels →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
