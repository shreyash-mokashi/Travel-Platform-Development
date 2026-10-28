import type { Metadata } from 'next';
import Link from 'next/link';
import { MEAL_PLAN_LABEL, formatMoney, type MealPlan } from '@voyago/shared';
import { InventoryEditor } from '@/components/admin/InventoryEditor';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Hotel inventory' };

interface HotelInventory {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  starRating: number;
  city: string;
  rooms: {
    id: string;
    name: string;
    description: string;
    totalRooms: number;
    maxOccupancy: number;
    isActive: boolean;
    ratePlans: {
      id: string;
      code: string;
      name: string;
      mealPlan: string;
      discountBasisPoints: number;
      isActive: boolean;
      cancellationPolicy: string;
      refundable: boolean;
    }[];
    inventory: { date: string; roomsOpen: number; baseRateMinor: number }[];
  }[];
}

export default async function AdminHotelInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hotel = await apiFetch<HotelInventory>(`/admin/hotels/${id}/inventory`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/hotels"
            className="text-sm font-semibold text-brand-700 hover:underline"
          >
            ← All properties
          </Link>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ink">{hotel.name}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {hotel.city} · {hotel.starRating} star · {hotel.rooms.length} room types
          </p>
        </div>
        <Badge tone={hotel.isActive ? 'success' : 'neutral'}>
          {hotel.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {hotel.rooms.map((room) => (
        <section key={room.id} className="vg-card p-5" data-testid={`admin-room-${room.id}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-lg font-bold text-ink">{room.name}</h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                {room.totalRooms} physical rooms · sleeps {room.maxOccupancy}
              </p>
            </div>
            <Badge tone={room.isActive ? 'success' : 'neutral'}>
              {room.isActive ? 'Selling' : 'Closed'}
            </Badge>
          </div>

          <div className="mt-4">
            <h4 className="vg-label">Rate plans</h4>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-sand-200 text-left">
                    <th scope="col" className="py-2 pr-4 font-semibold text-ink-soft">
                      Plan
                    </th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-ink-soft">
                      Meals
                    </th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-ink-soft">
                      Discount
                    </th>
                    <th scope="col" className="py-2 pr-4 font-semibold text-ink-soft">
                      Cancellation
                    </th>
                    <th scope="col" className="py-2 font-semibold text-ink-soft">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {room.ratePlans.map((plan) => (
                    <tr key={plan.id} className="border-b border-sand-100 last:border-0">
                      <td className="py-2.5 pr-4 text-ink-soft">{plan.name}</td>
                      <td className="py-2.5 pr-4 text-xs text-ink-muted">
                        {MEAL_PLAN_LABEL[plan.mealPlan as MealPlan] ?? plan.mealPlan}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums text-ink-soft">
                        {(plan.discountBasisPoints / 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-ink-muted">
                        {plan.cancellationPolicy}
                        <Badge tone={plan.refundable ? 'success' : 'neutral'} className="ml-2">
                          {plan.refundable ? 'Refundable' : 'Non-refundable'}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-xs text-ink-soft">
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 border-t border-sand-200 pt-4">
            <h4 className="vg-label">Next 30 nights</h4>
            <div className="mt-2 overflow-x-auto">
              <div className="flex gap-1.5 pb-2">
                {room.inventory.map((night) => (
                  <div
                    key={night.date}
                    className={`min-w-[78px] rounded-lg border px-2 py-2 text-center text-xs ${
                      night.roomsOpen === 0
                        ? 'border-coral-200 bg-coral-50'
                        : 'border-sand-200 bg-sand-100'
                    }`}
                    title={`${night.date}: ${night.roomsOpen} open at ${formatMoney(night.baseRateMinor)}`}
                  >
                    <p className="font-semibold text-ink-soft">{night.date.slice(5)}</p>
                    <p className="mt-0.5 tabular-nums text-ink">
                      {formatMoney(night.baseRateMinor)}
                    </p>
                    <p
                      className={`mt-0.5 font-semibold ${
                        night.roomsOpen === 0 ? 'text-coral-700' : 'text-brand-700'
                      }`}
                    >
                      {night.roomsOpen === 0 ? 'Sold out' : `${night.roomsOpen} open`}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <InventoryEditor roomId={room.id} defaultRoomsOpen={room.totalRooms} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
