import Image from 'next/image';
import Link from 'next/link';
import { AMENITY_LABEL, type AmenityCode, type HotelSummary } from '@voyago/shared';
import { Badge } from '../ui/Badge';
import { ButtonLink } from '../ui/Button';
import { Price } from '../ui/Price';
import { GuestScore, StarRating } from '../ui/Rating';

export function HotelCard({
  hotel,
  stayQueryString,
  nights,
}: {
  hotel: HotelSummary;
  stayQueryString: string;
  nights: number;
}) {
  const href = `/hotels/${hotel.slug}?${stayQueryString}`;
  const primaryImage = hotel.images[0];

  return (
    <article
      className="vg-card group overflow-hidden transition hover:shadow-lift"
      data-testid="hotel-card"
      data-hotel-slug={hotel.slug}
    >
      <div className="flex flex-col sm:flex-row">
        <Link
          href={href}
          className="relative block h-52 w-full shrink-0 overflow-hidden sm:h-auto sm:w-64"
          tabIndex={-1}
          aria-hidden
        >
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt}
              fill
              sizes="(max-width: 640px) 100vw, 256px"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sand-200 text-sm text-ink-faint">
              No image available
            </div>
          )}
          {hotel.freeCancellationAvailable ? (
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
              Free cancellation
            </span>
          ) : null}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StarRating value={hotel.starRating} />
              <span className="text-xs text-ink-muted">
                {hotel.locality}, {hotel.destination.city}
              </span>
            </div>

            <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug text-ink">
              <Link href={href} className="transition hover:text-brand-700">
                {hotel.name}
              </Link>
            </h3>

            <div className="mt-2">
              <GuestScore value={hotel.guestRating} reviewCount={hotel.reviewCount} />
            </div>

            <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
              {hotel.shortDescription}
            </p>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {hotel.amenities.slice(0, 4).map((code) => (
                <li key={code}>
                  <Badge>{AMENITY_LABEL[code as AmenityCode] ?? code}</Badge>
                </li>
              ))}
              {hotel.amenities.length > 4 ? (
                <li>
                  <Badge>+{hotel.amenities.length - 4} more</Badge>
                </li>
              ) : null}
            </ul>
          </div>

          <div className="flex shrink-0 flex-row items-end justify-between gap-3 border-t border-sand-200 pt-3 sm:w-44 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            {hotel.leadPriceMinor !== null ? (
              <div className="text-right">
                <p className="text-xs text-ink-muted">
                  {nights} night{nights > 1 ? 's' : ''}, total
                </p>
                <p
                  className="font-display text-2xl font-bold text-ink"
                  data-testid="hotel-card-price"
                  data-price-minor={hotel.leadPriceMinor}
                >
                  <Price minor={hotel.leadPriceMinor} />
                </p>
                {hotel.leadPricePerNightMinor !== null ? (
                  <p className="text-xs text-ink-muted">
                    <Price minor={hotel.leadPricePerNightMinor} suffix="per night" />
                  </p>
                ) : null}
                <p className="mt-0.5 text-[11px] text-ink-faint">Incl. taxes &amp; fees</p>
              </div>
            ) : (
              <p className="text-sm text-ink-muted">No rooms for these dates</p>
            )}

            <ButtonLink href={href} size="sm" className="sm:w-full" data-testid="view-hotel">
              View rooms
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}
