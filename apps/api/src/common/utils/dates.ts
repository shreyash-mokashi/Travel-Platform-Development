import { formatIsoDate, parseIsoDate } from '@voyago/shared';

/** Prisma @db.Date columns round-trip as UTC-midnight Date objects. */
export function toDbDate(iso: string): Date {
  return parseIsoDate(iso);
}

export function fromDbDate(value: Date): string {
  return formatIsoDate(value);
}
