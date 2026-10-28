import { randomInt } from 'node:crypto';

/** Unambiguous alphabet - no I, O, 0 or 1. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Generates a customer-facing booking reference such as VYG-7KD2P9QA. */
export function generateBookingReference(): string {
  let body = '';
  for (let index = 0; index < 8; index += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `VYG-${body}`;
}

export function generateSimulatorRef(): string {
  let body = '';
  for (let index = 0; index < 12; index += 1) {
    body += ALPHABET[randomInt(ALPHABET.length)];
  }
  return `SIMPAY_${body}`;
}
