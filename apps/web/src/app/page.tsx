import Image from 'next/image';
import Link from 'next/link';
import type { Destination, HotelSummary } from '@voyago/shared';
import { SearchWidget } from '@/components/search/SearchWidget';
import { ButtonLink } from '@/components/ui/Button';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { GuestScore, StarRating } from '@/components/ui/Rating';
import { apiFetch } from '@/lib/api';
import { defaultStay } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

// Free hosting suspends an idle API, so the first render after a quiet period
// waits while it wakes. Vercel's default function limit is well under that.
export const maxDuration = 60;

export default async function HomePage() {
  const [destinations, featured] = await Promise.all([
    apiFetch<Destination[]>('/destinations', { auth: false }),
    apiFetch<HotelSummary[]>('/hotels/featured', { auth: false }),
  ]);

  const stay = defaultStay();
  const popular = [...destinations]
    .sort((a, b) => (b.hotelCount ?? 0) - (a.hotelCount ?? 0))
    .slice(0, 6);

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink">
        <Image
          src="https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=2000&h=1100&q=80"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/85"
          aria-hidden
        />

        <div className="vg-container relative py-16 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sand-200 ring-1 ring-white/20">
              Portfolio demo · Hotels
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              Find a place to stay across India
            </h1>
            <p className="mt-4 text-base leading-relaxed text-sand-200 sm:text-lg">
              Search 25 demo properties in six cities, compare real room rates and cancellation
              policies, and complete a full booking with a simulated payment.
            </p>
          </div>

          <div className="mt-8">
            <SearchWidget
              destinations={destinations}
              defaults={{
                destination: '',
                checkIn: stay.checkIn,
                checkOut: stay.checkOut,
                rooms: 1,
                adults: 2,
                children: 0,
              }}
            />
            <p className="mt-3 text-xs text-sand-200/80">
              All inventory, pricing and payments on Voyago are simulated. No real bookings are made
              and no money is ever charged.
            </p>
          </div>
        </div>
      </section>

      <section className="vg-container py-14">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Popular destinations</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Six Indian cities with seeded hotel inventory.
            </p>
          </div>
          <Link
            href="/destinations"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            Browse all destinations →
          </Link>
        </header>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((destination) => (
            <li key={destination.id}>
              <Link
                href={`/hotels?destination=${destination.slug}&checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=2&children=0`}
                className="group relative flex h-48 overflow-hidden rounded-2xl shadow-card transition hover:shadow-lift"
                data-testid={`destination-card-${destination.slug}`}
              >
                <Image
                  src={destination.heroImageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span
                  className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent"
                  aria-hidden
                />
                <span className="relative mt-auto w-full p-4 text-white">
                  <span className="block font-display text-xl font-bold">{destination.city}</span>
                  <span className="mt-0.5 block text-xs text-sand-200">
                    {destination.hotelCount} demo hotels · {destination.state}
                  </span>
                  <span className="mt-2 block line-clamp-2 text-xs leading-relaxed text-sand-200/90">
                    {destination.tagline}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white py-14">
        <div className="vg-container">
          <div className="grid gap-6 rounded-2xl bg-brand-600 p-6 sm:grid-cols-3 sm:p-8">
            {[
              {
                title: 'Real server-side pricing',
                body: 'Every total is recalculated by the API against nightly inventory. The browser never decides a price.',
              },
              {
                title: 'Policy-driven refunds',
                body: 'Cancellation outcomes follow the rate plan you booked — some rates refund in full, others not at all.',
              },
              {
                title: 'Payment simulator',
                body: 'Run success, failure and pending outcomes, then retry safely. No card details are ever collected.',
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="font-display text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-100">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="vg-container py-14">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">Top-rated demo stays</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Highest guest scores across the seeded catalogue.
            </p>
          </div>
          <DemoNotice />
        </header>

        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((hotel) => (
            <li key={hotel.id}>
              <Link
                href={`/hotels/${hotel.slug}?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}&rooms=1&adults=2&children=0`}
                className="vg-card group flex h-full flex-col overflow-hidden transition hover:shadow-lift"
                data-testid={`featured-hotel-${hotel.slug}`}
              >
                <span className="relative block h-44 overflow-hidden">
                  {hotel.images[0] ? (
                    <Image
                      src={hotel.images[0].url}
                      alt={hotel.images[0].alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center bg-sand-200 text-sm text-ink-muted">
                      No image
                    </span>
                  )}
                </span>
                <span className="flex flex-1 flex-col p-4">
                  <StarRating value={hotel.starRating} />
                  <span className="mt-1.5 font-display text-lg font-semibold leading-snug text-ink transition group-hover:text-brand-700">
                    {hotel.name}
                  </span>
                  <span className="mt-0.5 text-xs text-ink-muted">
                    {hotel.locality}, {hotel.destination.city}
                  </span>
                  <span className="mt-3 block line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {hotel.shortDescription}
                  </span>
                  <span className="mt-auto pt-4">
                    <GuestScore value={hotel.guestRating} reviewCount={hotel.reviewCount} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="vg-container pb-16">
        <div className="vg-card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">
              Flights, packages and activities are next
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-ink-muted">
              Voyago is built as a modular platform. The hotel service is complete end to end; the
              remaining travel services reuse the same booking, payment and refund core.
            </p>
          </div>
          <ButtonLink href="/roadmap" variant="secondary">
            See the roadmap
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
