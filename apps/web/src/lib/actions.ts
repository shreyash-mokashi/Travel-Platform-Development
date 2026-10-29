'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type {
  BookingView,
  FlightBookingView,
  FlightQuoteView,
  QuoteResponse,
} from '@voyago/shared';
import { apiFetch } from './api';
import { ApiError, toUserMessage } from './api-error';
import { bookingApiBase } from './booking-product';
import type { ActionState } from './action-state';
import { clearSession, getRefreshToken, login, register } from './session';

/** Maps the API's `details` array onto per-field messages. */
function fieldErrorsFrom(error: unknown): Record<string, string> | undefined {
  if (!(error instanceof ApiError)) return undefined;
  const entries = error.details
    .map((detail) => {
      const match = /^([A-Za-z0-9_.]+)\s/.exec(detail);
      return match ? ([match[1] as string, detail] as const) : null;
    })
    .filter((entry): entry is readonly [string, string] => entry !== null);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const returnTo = String(formData.get('returnTo') ?? '/bookings');

  if (!email || !password) {
    return { ok: false, message: 'Enter your email address and password.' };
  }

  try {
    await login(email, password);
  } catch (error) {
    return { ok: false, message: toUserMessage(error, 'Could not sign you in.') };
  }

  redirect(returnTo.startsWith('/') ? returnTo : '/bookings');
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const input = {
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    firstName: String(formData.get('firstName') ?? '').trim(),
    lastName: String(formData.get('lastName') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim() || undefined,
  };
  const returnTo = String(formData.get('returnTo') ?? '/bookings');

  if (String(formData.get('confirmPassword') ?? '') !== input.password) {
    return { ok: false, message: 'The two passwords do not match.' };
  }

  try {
    await register(input);
  } catch (error) {
    return {
      ok: false,
      message: toUserMessage(error, 'Could not create your account.'),
      fieldErrors: fieldErrorsFrom(error),
    };
  }

  redirect(returnTo.startsWith('/') ? returnTo : '/bookings');
}

export async function logoutAction(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await apiFetch('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
    } catch {
      // Revoking server-side is best effort; the cookies are cleared regardless.
    }
  }
  await clearSession();
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await apiFetch('/auth/me', {
      method: 'PATCH',
      body: {
        firstName: String(formData.get('firstName') ?? '').trim(),
        lastName: String(formData.get('lastName') ?? '').trim(),
        phone: String(formData.get('phone') ?? '').trim() || undefined,
      },
    });
  } catch (error) {
    return { ok: false, message: toUserMessage(error, 'Could not save your profile.') };
  }

  revalidatePath('/account');
  return { ok: true, message: 'Profile updated.' };
}

/**
 * Creates a server-side price quote and sends the user to checkout. The price
 * shown in results is passed only so the next page can flag a change.
 */
export async function createQuoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const payload = {
    hotelId: String(formData.get('hotelId') ?? ''),
    roomId: String(formData.get('roomId') ?? ''),
    ratePlanId: String(formData.get('ratePlanId') ?? ''),
    checkIn: String(formData.get('checkIn') ?? ''),
    checkOut: String(formData.get('checkOut') ?? ''),
    rooms: Number(formData.get('rooms') ?? 1),
    adults: Number(formData.get('adults') ?? 2),
    children: Number(formData.get('children') ?? 0),
    expectedTotalMinor: Number(formData.get('expectedTotalMinor') ?? 0) || undefined,
  };

  let quote: QuoteResponse;
  try {
    quote = await apiFetch<QuoteResponse>('/quotes', { method: 'POST', body: payload });
  } catch (error) {
    return { ok: false, message: toUserMessage(error, 'That room could not be held.') };
  }

  redirect(`/checkout/${quote.quoteId}`);
}

export async function createBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const guestCount = Number(formData.get('guestCount') ?? 1);
  const guests = Array.from({ length: Math.max(1, guestCount) }, (_, index) => ({
    firstName: String(formData.get(`guestFirstName-${index}`) ?? '').trim(),
    lastName: String(formData.get(`guestLastName-${index}`) ?? '').trim(),
    isLeadGuest: index === 0,
  })).filter((guest) => guest.firstName || guest.lastName || guest.isLeadGuest);

  const payload = {
    quoteId: String(formData.get('quoteId') ?? ''),
    contactEmail: String(formData.get('contactEmail') ?? '').trim(),
    contactPhone: String(formData.get('contactPhone') ?? '').trim(),
    specialRequests: String(formData.get('specialRequests') ?? '').trim() || undefined,
    acceptedCancellationPolicy: formData.get('acceptedCancellationPolicy') === 'on',
    guests,
  };

  if (!payload.acceptedCancellationPolicy) {
    return { ok: false, message: 'Please accept the cancellation policy to continue.' };
  }

  let booking: BookingView;
  try {
    booking = await apiFetch<BookingView>('/bookings', { method: 'POST', body: payload });
  } catch (error) {
    return {
      ok: false,
      message: toUserMessage(error, 'Your booking could not be created.'),
      fieldErrors: fieldErrorsFrom(error),
    };
  }

  redirect(`/checkout/payment/${booking.reference}`);
}

/**
 * Creates a server-side fare quote and sends the user to flight checkout.
 * The price shown in results is passed only so the next page can flag a change.
 */
export async function createFlightQuoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const payload = {
    flightId: String(formData.get('flightId') ?? ''),
    fareClassId: String(formData.get('fareClassId') ?? ''),
    date: String(formData.get('date') ?? ''),
    adults: Number(formData.get('adults') ?? 1),
    children: Number(formData.get('children') ?? 0),
    expectedTotalMinor: Number(formData.get('expectedTotalMinor') ?? 0) || undefined,
  };

  let quote: FlightQuoteView;
  try {
    quote = await apiFetch<FlightQuoteView>('/flight-quotes', { method: 'POST', body: payload });
  } catch (error) {
    return { ok: false, message: toUserMessage(error, 'That fare could not be held.') };
  }

  redirect(`/flights/checkout/${quote.quoteId}`);
}

export async function createFlightBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const passengerCount = Number(formData.get('passengerCount') ?? 1);
  const passengers = Array.from({ length: Math.max(1, passengerCount) }, (_, index) => ({
    firstName: String(formData.get(`passengerFirstName-${index}`) ?? '').trim(),
    lastName: String(formData.get(`passengerLastName-${index}`) ?? '').trim(),
    isLeadPassenger: index === 0,
  }));

  const payload = {
    quoteId: String(formData.get('quoteId') ?? ''),
    contactEmail: String(formData.get('contactEmail') ?? '').trim(),
    contactPhone: String(formData.get('contactPhone') ?? '').trim(),
    acceptedCancellationPolicy: formData.get('acceptedCancellationPolicy') === 'on',
    passengers,
  };

  if (!payload.acceptedCancellationPolicy) {
    return { ok: false, message: 'Please accept the fare rules to continue.' };
  }

  let booking: FlightBookingView;
  try {
    booking = await apiFetch<FlightBookingView>('/flight-bookings', {
      method: 'POST',
      body: payload,
    });
  } catch (error) {
    return {
      ok: false,
      message: toUserMessage(error, 'Your booking could not be created.'),
      fieldErrors: fieldErrorsFrom(error),
    };
  }

  redirect(`/checkout/payment/${booking.reference}`);
}

export async function payBookingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reference = String(formData.get('reference') ?? '');
  const scenario = String(formData.get('scenario') ?? 'SUCCESS');
  // The key is generated per rendered form, so a double submit is absorbed.
  const idempotencyKey = String(formData.get('idempotencyKey') ?? '');

  try {
    await apiFetch(`${bookingApiBase(reference)}/${reference}/payments`, {
      method: 'POST',
      body: { scenario, idempotencyKey },
    });
  } catch (error) {
    return { ok: false, message: toUserMessage(error, 'The demo payment could not be processed.') };
  }

  revalidatePath(`/checkout/payment/${reference}`);
  redirect(`/bookings/${reference}?justPaid=1`);
}

export async function resolvePendingPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const reference = String(formData.get('reference') ?? '');
  const outcome = String(formData.get('outcome') ?? 'SUCCESS');

  try {
    await apiFetch(`${bookingApiBase(reference)}/${reference}/payments/resolve`, {
      method: 'POST',
      body: { outcome },
    });
  } catch (error) {
    return { ok: false, message: toUserMessage(error, 'Could not resolve the pending payment.') };
  }

  revalidatePath(`/bookings/${reference}`);
  redirect(`/bookings/${reference}`);
}
