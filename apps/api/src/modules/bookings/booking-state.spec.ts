import { BOOKING_TRANSITIONS, canTransition, type BookingStatus } from '@voyago/shared';
import { AvailabilityService } from '../availability/availability.service';

describe('booking state machine', () => {
  it('allows the happy path from creation to confirmation', () => {
    expect(canTransition('PENDING_PAYMENT', 'PAYMENT_PROCESSING')).toBe(true);
    expect(canTransition('PAYMENT_PROCESSING', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
  });

  it('allows a retry after a failed payment', () => {
    expect(canTransition('PAYMENT_PROCESSING', 'PAYMENT_FAILED')).toBe(true);
    expect(canTransition('PAYMENT_FAILED', 'PAYMENT_PROCESSING')).toBe(true);
  });

  it('refuses to confirm a booking that was never paid', () => {
    expect(canTransition('PENDING_PAYMENT', 'CONFIRMED')).toBe(false);
  });

  it('refuses to reopen a terminal booking', () => {
    for (const terminal of ['CANCELLED', 'EXPIRED'] as BookingStatus[]) {
      expect(BOOKING_TRANSITIONS[terminal]).toHaveLength(0);
      expect(canTransition(terminal, 'CONFIRMED')).toBe(false);
      expect(canTransition(terminal, 'PENDING_PAYMENT')).toBe(false);
    }
  });

  it('refuses to move a cancelled booking back to processing', () => {
    expect(canTransition('CANCELLED', 'PAYMENT_PROCESSING')).toBe(false);
  });

  it('never lists a status as a transition to itself', () => {
    for (const [from, targets] of Object.entries(BOOKING_TRANSITIONS)) {
      expect(targets).not.toContain(from);
    }
  });
});

describe('AvailabilityService.perRoomOccupancy', () => {
  it('splits guests evenly across rooms', () => {
    expect(
      AvailabilityService.perRoomOccupancy({
        checkIn: '2026-12-10',
        checkOut: '2026-12-12',
        rooms: 2,
        adults: 4,
        children: 2,
      }),
    ).toEqual({ adults: 2, children: 1 });
  });

  it('rounds up so no room is under-sized', () => {
    expect(
      AvailabilityService.perRoomOccupancy({
        checkIn: '2026-12-10',
        checkOut: '2026-12-12',
        rooms: 2,
        adults: 3,
        children: 1,
      }),
    ).toEqual({ adults: 2, children: 1 });
  });

  it('handles a single room with no children', () => {
    expect(
      AvailabilityService.perRoomOccupancy({
        checkIn: '2026-12-10',
        checkOut: '2026-12-12',
        rooms: 1,
        adults: 2,
        children: 0,
      }),
    ).toEqual({ adults: 2, children: 0 });
  });
});
