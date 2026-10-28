'use server';

import { revalidatePath } from 'next/cache';
import { toMinorUnits } from '@voyago/shared';
import { apiFetch } from './api';
import { toUserMessage } from './api-error';
import type { ActionState } from './action-state';

/** Bulk-updates nightly availability and tariff for a room type. */
export async function updateInventoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const roomId = String(formData.get('roomId') ?? '');
  const roomsOpenRaw = String(formData.get('roomsOpen') ?? '').trim();
  const rateRaw = String(formData.get('baseRateRupees') ?? '').trim();

  const payload: Record<string, unknown> = {
    fromDate: String(formData.get('fromDate') ?? ''),
    toDate: String(formData.get('toDate') ?? ''),
  };
  if (roomsOpenRaw !== '') payload.roomsOpen = Number(roomsOpenRaw);
  // The UI works in rupees; the API only ever stores integer minor units.
  if (rateRaw !== '') payload.baseRateMinor = toMinorUnits(Number(rateRaw));

  if (roomsOpenRaw === '' && rateRaw === '') {
    return { ok: false, message: 'Enter a room count, a nightly rate, or both.' };
  }

  let result: { updated: number; message: string };
  try {
    result = await apiFetch(`/admin/rooms/${roomId}/inventory`, {
      method: 'PATCH',
      body: payload,
    });
  } catch (error) {
    return { ok: false, message: toUserMessage(error, 'Inventory could not be updated.') };
  }

  revalidatePath('/admin/hotels', 'layout');
  return { ok: true, message: result.message };
}

export async function toggleHotelActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const hotelId = String(formData.get('hotelId') ?? '');
  const isActive = formData.get('isActive') === 'true';

  try {
    await apiFetch(`/admin/hotels/${hotelId}`, { method: 'PATCH', body: { isActive } });
  } catch (error) {
    return { ok: false, message: toUserMessage(error, 'The property could not be updated.') };
  }

  revalidatePath('/admin/hotels', 'layout');
  return { ok: true, message: isActive ? 'Property is now selling.' : 'Property is now hidden.' };
}
