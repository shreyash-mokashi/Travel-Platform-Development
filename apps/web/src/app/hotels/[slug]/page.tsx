import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AMENITY_LABEL,
  formatDisplayDate,
  nightsBetween,
  type AmenityCode,
  type HotelDetail,
} from '@voyago/shared';
import { HotelGallery } from '@/components/hotels/HotelGallery';
import { RoomOfferCard } from '@/components/hotels/RoomOfferCard';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { EmptyState } from '@/components/ui/EmptyState';
import { GuestScore, StarRating } from '@/components/ui/Rating';
import { apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { parseSearchParams, stayQuery, type RawSearchParams } from '@/lib/search-params';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}

async function loadHotel(slug: string, search: ReturnType<typeof parseSearchParams>) {
  try {
    return await apiFetch<HotelDetail>(`/hotels/${slug}?${stayQuery(search)}`, { auth: false });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await loadHotel(slug, parseSearchParams(await searchParams));
  // Next streams every dynamic route, so the 200 status line is already sent
  // by the time a page body can raise not-found. Raising it here, during
  // metadata resolution, renders the not-found UI as early as possible.
  if (!hotel) notFound();
  return {
    title: `${hotel.name}, ${hotel.destination.city}`,
    description: hotel.shortDescription,
  };
}

export default async function HotelDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const search = parseSearchParams(await searchParams);
  const hotel = await loadHotel(slug, search);
  if (!hotel) notFound();

  const nights = nightsBetween(search.checkIn, search.checkOut);
  const stay = stayQuery(search);
  const backHref = `/hotels?destination=${hotel.destination.slug}&${stay}`;

  return (
    <div className="vg-container py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-brand-700 hover:underline">
              Hotels
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={backHref} className="hover:text-brand-700 hover:underline">
              {hotel.destination.city}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-medium text-ink-soft">
            {hotel.name}
          </li>
        </ol>
      </nav>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <StarRating value={hotel.starRating} />
          <h1 className="mt-1.5 font-display text-3xl font-bold leading-tight text-ink">
            {hotel.name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {hotel.addressLine}, {hotel.locality}, {hotel.destination.city},{' '}
            {hotel.destination.state}
          </p>
          <div className="mt-3">
            <GuestScore value={hotel.guestRating} reviewCount={hotel.reviewCount} />
          </div>
        </div>

        {hotel.leadPriceMinor !== null ? (
          <div className="text-right">
            <p className="text-xs text-ink-muted">
              From, total for {nights} night{nights > 1 ? 's' : ''}
            </p>
            <p className="font-display text-3xl font-bold text-ink">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(hotel.leadPriceMinor / 100)}
            </p>
            <ButtonLink href="#rooms" size="sm" className="mt-2">
              See rooms
            </ButtonLink>
          </div>
        ) : null}
      </header>

      <HotelGallery images={hotel.images} hotelName={hotel.name} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="font-display text-xl font-bold text-ink">About this property</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
              {hotel.description}
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-ink">Amenities</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {hotel.amenities.map((code) => (
                <li key={code} className="flex items-center gap-2 text-sm text-ink-soft">
                  <span className="text-brand-600" aria-hidden>
                    ✓
                  </span>
                  {AMENITY_LABEL[code as AmenityCode] ?? code}
                </li>
              ))}
            </ul>
          </section>

          <section id="rooms" className="scroll-mt-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Available rooms</h2>
                <p className="mt-1 text-sm text-ink-muted" data-testid="stay-summary">
                  {formatDisplayDate(search.checkIn)} – {formatDisplayDate(search.checkOut)} ·{' '}
                  {nights} night{nights > 1 ? 's' : ''} · {search.rooms} room
                  {search.rooms > 1 ? 's' : ''} · {search.adults} adult
                  {search.adults > 1 ? 's' : ''}
                  {search.children > 0 ? `, ${search.children} children` : ''}
                </p>
              </div>
              <Link
                href={backHref}
                className="text-sm font-semibold text-brand-700 hover:underline"
              >
                Change dates or guests
              </Link>
            </div>

            <DemoNotice variant="banner" className="mt-4" />

            <div className="mt-4 space-y-4" data-testid="room-offers">
              {hotel.offers.length === 0 ? (
                <EmptyState
                  title="No rooms available for these dates"
                  description="This demo property has no inventory open for the dates and occupancy you chose. Try different dates, or fewer guests per room."
                  icon="🛏️"
                  action={
                    <ButtonLink href={backHref} variant="secondary">
                      Back to search results
                    </ButtonLink>
                  }
                />
              ) : (
                hotel.offers.map((offer) => (
                  <RoomOfferCard
                    key={`${offer.roomId}-${offer.ratePlan.id}`}
                    offer={offer}
                    hotelId={hotel.id}
                    stay={{ ...search, nights }}
                  />
                ))
              )}
            </div>
          </section>

          {hotel.content ? (
            <section>
              <h2 className="font-display text-xl font-bold text-ink">{hotel.content.headline}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{hotel.content.intro}</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {hotel.content.highlights.map((item) => (
                  <div key={item.title} className="vg-card p-4">
                    <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-ink">Best time to visit</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  {hotel.content.bestTimeToVisit}
                </p>
              </div>

              {hotel.content.faqs.length > 0 ? (
                <div className="mt-5 space-y-2">
                  <h3 className="text-sm font-semibold text-ink">Good to know</h3>
                  {hotel.content.faqs.map((faq) => (
                    <details key={faq.question} className="vg-card px-4 py-3">
                      <summary className="cursor-pointer text-sm font-medium text-ink">
                        {faq.question}
                      </summary>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{faq.answer}</p>
                    </details>
                  ))}
                </div>
              ) : null}
              <p className="mt-3 text-xs text-ink-faint">
                Destination guide content is stored in MongoDB and maintained separately from
                booking records.
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Check-in &amp; check-out</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Check-in from</dt>
                <dd className="font-semibold text-ink">{hotel.checkInTime}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Check-out by</dt>
                <dd className="font-semibold text-ink">{hotel.checkOutTime}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Reception</dt>
                <dd className="text-right font-medium text-ink-soft">{hotel.phone}</dd>
              </div>
            </dl>
          </div>

          <div className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Property policies</h2>
            <ul className="mt-3 space-y-2">
              {hotel.policies.map((policy) => (
                <li key={policy} className="flex gap-2 text-xs leading-relaxed text-ink-soft">
                  <span className="text-ink-faint" aria-hidden>
                    •
                  </span>
                  {policy}
                </li>
              ))}
            </ul>
          </div>

          <div className="vg-card p-5">
            <h2 className="font-display text-base font-bold text-ink">Location</h2>
            <p className="mt-2 text-sm text-ink-soft">
              {hotel.locality}, {hotel.destination.city}
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              {hotel.latitude.toFixed(4)}, {hotel.longitude.toFixed(4)}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>{hotel.destination.state}</Badge>
              <Badge>{hotel.starRating} star</Badge>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
