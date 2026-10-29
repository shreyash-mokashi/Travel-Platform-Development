/**
 * Hotel bookings carry VYG- references, flight bookings VYF-. The reference
 * therefore names its product, and every shared surface (payment page,
 * cancellation route, booking detail) routes on this one helper instead of
 * duplicating prefix checks.
 */
export type BookingProduct = 'hotel' | 'flight';

export function productOf(reference: string): BookingProduct {
  return reference.toUpperCase().startsWith('VYF-') ? 'flight' : 'hotel';
}

export function bookingApiBase(reference: string): string {
  return productOf(reference) === 'flight' ? '/flight-bookings' : '/bookings';
}
