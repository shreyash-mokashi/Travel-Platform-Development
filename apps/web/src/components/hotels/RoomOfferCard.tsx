'use client';

import { useActionState } from 'react';
import { MEAL_PLAN_LABEL, formatMoney, type RoomOffer } from '@voyago/shared';
import { createQuoteAction } from '@/lib/actions';
import { emptyActionState } from '@/lib/action-state';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Price } from '../ui/Price';

interface StayContext {
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  nights: number;
}

export function RoomOfferCard({
  offer,
  hotelId,
  stay,
}: {
  offer: RoomOffer;
  hotelId: string;
  stay: StayContext;
}) {
  const [state, formAction, pending] = useActionState(createQuoteAction, emptyActionState);
  const policy = offer.ratePlan.cancellationPolicy;
  const perNight = Math.round(offer.price.totalMinor / Math.max(1, stay.nights));

  return (
    <div
      className="vg-card p-4 sm:p-5"
      data-testid="room-offer"
      data-room-id={offer.roomId}
      data-rate-plan-id={offer.ratePlan.id}
    >
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-ink">{offer.roomName}</h3>
          <p className="mt-1 text-xs text-ink-muted">
            {offer.sizeSqm} sqm · {offer.bedType} · sleeps {offer.maxOccupancy} (max{' '}
            {offer.maxAdults} adults, {offer.maxChildren} children)
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{offer.roomDescription}</p>

          <div className="mt-4 rounded-xl bg-sand-100 p-3.5">
            <p className="text-sm font-semibold text-ink">{offer.ratePlan.name}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{offer.ratePlan.description}</p>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <Badge tone="info">{MEAL_PLAN_LABEL[offer.ratePlan.mealPlan]}</Badge>
              <Badge tone={policy.refundable ? 'success' : 'neutral'}>
                {policy.refundable ? 'Refundable' : 'Non-refundable'}
              </Badge>
              {offer.ratePlan.discountBasisPoints > 0 ? (
                <Badge tone="accent">
                  {(offer.ratePlan.discountBasisPoints / 100).toFixed(0)}% off
                </Badge>
              ) : null}
              {offer.roomsAvailable <= 3 ? (
                <Badge tone="danger">Only {offer.roomsAvailable} left</Badge>
              ) : null}
            </div>

            <details className="mt-3 group">
              <summary className="cursor-pointer text-xs font-semibold text-brand-700 hover:underline">
                Cancellation policy
              </summary>
              <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink-soft">
                <p>{policy.description}</p>
                {policy.tiers.length > 0 ? (
                  <ul className="list-inside list-disc space-y-0.5">
                    {policy.tiers.map((tier) => (
                      <li key={tier.hoursBeforeCheckIn}>{tier.label}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          </div>
        </div>

        <div className="shrink-0 border-t border-sand-200 pt-4 lg:w-60 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="text-right">
            {offer.price.discountMinor > 0 ? (
              <p className="text-xs text-ink-muted line-through">
                {formatMoney(offer.price.baseAmountMinor)}
              </p>
            ) : null}
            <p className="font-display text-2xl font-bold text-ink">
              <Price minor={offer.price.totalMinor} />
            </p>
            <p className="text-xs text-ink-muted">
              for {stay.nights} night{stay.nights > 1 ? 's' : ''}, {stay.rooms} room
              {stay.rooms > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-ink-muted">
              <Price minor={perNight} suffix="per night, incl. taxes" />
            </p>
          </div>

          <dl className="mt-3 space-y-1 border-t border-sand-200 pt-3 text-xs">
            {offer.price.lines.map((line) => (
              <div key={line.code} className="flex justify-between gap-2">
                <dt className="text-ink-muted">{line.label}</dt>
                <dd
                  className={
                    line.amountMinor < 0
                      ? 'font-medium text-brand-700'
                      : 'font-medium text-ink-soft'
                  }
                >
                  {formatMoney(line.amountMinor)}
                </dd>
              </div>
            ))}
          </dl>

          {state.message ? (
            <Alert tone="error" className="mt-3">
              {state.message}
            </Alert>
          ) : null}

          <form action={formAction} className="mt-3">
            <input type="hidden" name="hotelId" value={hotelId} />
            <input type="hidden" name="roomId" value={offer.roomId} />
            <input type="hidden" name="ratePlanId" value={offer.ratePlan.id} />
            <input type="hidden" name="checkIn" value={stay.checkIn} />
            <input type="hidden" name="checkOut" value={stay.checkOut} />
            <input type="hidden" name="rooms" value={stay.rooms} />
            <input type="hidden" name="adults" value={stay.adults} />
            <input type="hidden" name="children" value={stay.children} />
            <input type="hidden" name="expectedTotalMinor" value={offer.price.totalMinor} />
            <Button type="submit" fullWidth disabled={pending} data-testid="select-room">
              {pending ? 'Checking price…' : 'Select room'}
            </Button>
          </form>
          <p className="mt-2 text-center text-[11px] text-ink-muted">
            We re-check the price before you pay.
          </p>
        </div>
      </div>
    </div>
  );
}
