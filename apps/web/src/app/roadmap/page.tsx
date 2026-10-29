import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'What is built in Voyago today and what the shared architecture supports next.',
};

const SERVICES = [
  {
    name: 'Hotel booking',
    status: 'Built' as const,
    description:
      'Search, filters, hotel detail, room and rate-plan selection, server-side price recheck, ' +
      'persisted bookings, demo payments, vouchers, cancellation and refund simulation.',
  },
  {
    name: 'Flight booking',
    status: 'Built' as const,
    description:
      'One-way flights across six cities with fare families (Saver, Flexi, Business), seat ' +
      'inventory, server-side fare recheck, passenger details, demo payments, e-tickets and ' +
      'fare-rule cancellation - on the same quote, booking, payment and refund core as hotels.',
  },
  {
    name: 'Holiday packages',
    status: 'Next' as const,
    description: 'Composes hotel and flight inventory into a single bookable itinerary.',
  },
  {
    name: 'Activities and experiences',
    status: 'Planned' as const,
    description:
      'Time-slot inventory rather than night-based inventory, on the same pricing engine.',
  },
  {
    name: 'Car rentals',
    status: 'Planned' as const,
    description:
      'Vehicle classes and pickup/drop-off locations using the existing availability model.',
  },
];

const TONE = { Built: 'success', Next: 'accent', Planned: 'neutral' } as const;

export default function RoadmapPage() {
  return (
    <div className="vg-container max-w-3xl py-10">
      <h1 className="font-display text-3xl font-bold text-ink">Platform roadmap</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        Voyago is built as a modular monolith so each travel service can be added without rewriting
        the application. The hotel and flight services are complete end to end and define the
        patterns the remaining services follow.
      </p>

      <ul className="mt-8 space-y-4">
        {SERVICES.map((service) => (
          <li key={service.name} className="vg-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-lg font-bold text-ink">{service.name}</h2>
              <Badge tone={TONE[service.status]}>{service.status}</Badge>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.description}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/">Search demo hotels</ButtonLink>
        <ButtonLink href="/flights" variant="secondary">
          Search demo flights
        </ButtonLink>
        <ButtonLink href="/destinations" variant="secondary">
          Browse destinations
        </ButtonLink>
      </div>
    </div>
  );
}
