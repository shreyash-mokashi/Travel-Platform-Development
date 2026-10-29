import Image from 'next/image';
import { formatDisplayDate, formatMoney, type PriceBreakdown } from '@voyago/shared';
import { StarRating } from '../ui/Rating';

/** The sticky stay-and-price panel shown through checkout. */
export function PriceSummary({
  hotelName,
  starRating,
  addressLine,
  city,
  imageUrl,
  roomName,
  ratePlanName,
  checkIn,
  checkOut,
  nights,
  rooms,
  adults,
  childCount,
  price,
}: {
  hotelName: string;
  starRating: number;
  addressLine: string;
  city: string;
  imageUrl: string | null;
  roomName: string;
  ratePlanName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  /** Guest count, not React content - hence the explicit name. */
  childCount: number;
  price: PriceBreakdown;
}) {
  return (
    <div className="vg-card overflow-hidden" data-testid="price-summary">
      {imageUrl ? (
        <div className="relative h-36 w-full">
          <Image src={imageUrl} alt="" fill sizes="340px" className="object-cover" />
        </div>
      ) : null}

      <div className="p-5">
        <StarRating value={starRating} />
        <h2 className="mt-1.5 font-display text-lg font-bold leading-snug text-ink">{hotelName}</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          {addressLine}, {city}
        </p>

        <dl className="mt-4 space-y-2 border-t border-sand-200 pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Check-in</dt>
            <dd className="text-right font-medium text-ink">{formatDisplayDate(checkIn)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Check-out</dt>
            <dd className="text-right font-medium text-ink">{formatDisplayDate(checkOut)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Stay</dt>
            <dd className="text-right font-medium text-ink">
              {nights} night{nights > 1 ? 's' : ''}, {rooms} room{rooms > 1 ? 's' : ''}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Guests</dt>
            <dd className="text-right font-medium text-ink">
              {adults} adult{adults > 1 ? 's' : ''}
              {childCount > 0 ? `, ${childCount} child${childCount > 1 ? 'ren' : ''}` : ''}
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-sand-200 pt-4">
          <p className="text-sm font-semibold text-ink">{roomName}</p>
          <p className="text-xs text-ink-muted">{ratePlanName}</p>
        </div>

        <dl className="mt-4 space-y-2 border-t border-sand-200 pt-4 text-sm">
          {price.lines.map((line) => (
            <div key={line.code} className="flex justify-between gap-3">
              <dt className="text-ink-muted">{line.label}</dt>
              <dd
                className={`text-right font-medium tabular-nums ${
                  line.amountMinor < 0 ? 'text-brand-700' : 'text-ink-soft'
                }`}
              >
                {formatMoney(line.amountMinor)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 flex items-baseline justify-between border-t-2 border-ink/10 pt-4">
          <span className="font-display text-base font-bold text-ink">Total</span>
          <span
            className="font-display text-2xl font-bold tabular-nums text-ink"
            data-testid="summary-total"
          >
            {formatMoney(price.totalMinor)}
          </span>
        </div>
        <p className="mt-1 text-right text-xs text-ink-muted">Includes all taxes and fees</p>
      </div>
    </div>
  );
}
