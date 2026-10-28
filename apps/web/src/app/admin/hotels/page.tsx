import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Admin inventory' };

interface AdminHotelRow {
  id: string;
  slug: string;
  name: string;
  starRating: number;
  guestRating: number;
  city: string;
  state: string;
  locality: string;
  amenities: string[];
  isActive: boolean;
  imageUrl: string | null;
  roomCount: number;
  bookingCount: number;
}

export default async function AdminHotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Number((await searchParams).page) || 1;
  const data = await apiFetch<{
    items: AdminHotelRow[];
    page: number;
    totalPages: number;
    total: number;
  }>(`/admin/hotels?page=${page}&pageSize=20`);

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-muted">
        {data.total} demo properties. Open one to manage its rooms, rate plans and nightly
        inventory.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="admin-hotel-list">
        {data.items.map((hotel) => (
          <li key={hotel.id}>
            <Link
              href={`/admin/hotels/${hotel.id}`}
              className="vg-card flex h-full flex-col overflow-hidden transition hover:shadow-lift"
            >
              <span className="relative block h-32">
                {hotel.imageUrl ? (
                  <Image src={hotel.imageUrl} alt="" fill sizes="340px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center bg-sand-200 text-xs text-ink-faint">
                    No image
                  </span>
                )}
                {!hotel.isActive ? (
                  <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-semibold text-white">
                    Inactive
                  </span>
                ) : null}
              </span>
              <span className="flex flex-1 flex-col p-4">
                <span className="font-display text-base font-bold text-ink">{hotel.name}</span>
                <span className="mt-0.5 text-xs text-ink-muted">
                  {hotel.locality}, {hotel.city}
                </span>
                <span className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge>{hotel.starRating} star</Badge>
                  <Badge>{hotel.roomCount} room types</Badge>
                  <Badge tone={hotel.bookingCount > 0 ? 'success' : 'neutral'}>
                    {hotel.bookingCount} bookings
                  </Badge>
                </span>
                <span className="mt-auto pt-3 text-xs font-semibold text-brand-700">
                  Manage inventory →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {data.totalPages > 1 ? (
        <nav aria-label="Pages" className="flex justify-center gap-2">
          {Array.from({ length: data.totalPages }, (_, index) => index + 1).map((value) => (
            <Link
              key={value}
              href={`/admin/hotels?page=${value}`}
              aria-current={value === data.page ? 'page' : undefined}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold ${
                value === data.page
                  ? 'bg-brand-600 text-white'
                  : 'border border-sand-300 bg-white text-ink-soft hover:border-brand-400'
              }`}
            >
              {value}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
