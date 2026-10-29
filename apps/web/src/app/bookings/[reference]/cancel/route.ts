import { type NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { bookingApiBase } from '@/lib/booking-product';
import { toUserMessage } from '@/lib/api-error';

/**
 * Cancellation is a plain HTML form POST handled here with a 303 redirect,
 * not a server action. A React server action submitted from a page that was
 * itself just reached through an action redirect intermittently never gets
 * its response applied, leaving the form stuck at "Cancelling…" (reproduced
 * with returned state, with redirects, and with and without revalidatePath).
 * A native form navigation cannot be dropped by the client, and it works
 * without JavaScript as a bonus. The booking page renders the outcome from
 * ?cancelled=1 or ?cancelError=…
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const form = await request.formData();
  const reason = String(form.get('reason') ?? '').trim() || undefined;

  const target = new URL(`/bookings/${reference}`, request.url);
  try {
    await apiFetch(`${bookingApiBase(reference)}/${reference}/cancellation`, {
      method: 'POST',
      body: { reason },
    });
    target.searchParams.set('cancelled', '1');
  } catch (error) {
    target.searchParams.set(
      'cancelError',
      toUserMessage(error, 'The booking could not be cancelled.'),
    );
  }
  return NextResponse.redirect(target, 303);
}
