import { applyBasisPoints } from './money';

/**
 * A cancellation policy is an ordered set of tiers. The tier that applies is
 * the first one whose `hoursBeforeCheckIn` threshold the request still meets.
 */
export interface CancellationTier {
  /** Cancel at least this many hours before check-in to get this outcome. */
  hoursBeforeCheckIn: number;
  /** Penalty charged, in basis points of the booking total. */
  penaltyBasisPoints: number;
  label: string;
}

export interface CancellationPolicy {
  code: string;
  name: string;
  description: string;
  refundable: boolean;
  tiers: CancellationTier[];
}

export interface CancellationOutcome {
  allowed: boolean;
  refundable: boolean;
  appliedTier: CancellationTier | null;
  penaltyMinor: number;
  refundMinor: number;
  hoursToCheckIn: number;
  reason: string;
}

export function hoursUntil(checkInIso: string, now: Date): number {
  const checkIn = new Date(`${checkInIso}T12:00:00.000Z`).getTime();
  return (checkIn - now.getTime()) / 3_600_000;
}

/**
 * Evaluates a cancellation request against the booking's seeded policy.
 * Non-refundable policies still allow cancellation - they simply return a
 * zero refund rather than silently refunding everything.
 */
export function evaluateCancellation(args: {
  policy: CancellationPolicy;
  totalMinor: number;
  checkIn: string;
  now?: Date;
}): CancellationOutcome {
  const now = args.now ?? new Date();
  const hoursToCheckIn = hoursUntil(args.checkIn, now);

  if (!args.policy.refundable) {
    return {
      allowed: true,
      refundable: false,
      appliedTier: null,
      penaltyMinor: args.totalMinor,
      refundMinor: 0,
      hoursToCheckIn,
      reason: 'This rate is non-refundable, so no amount is returned on cancellation.',
    };
  }

  const sorted = [...args.policy.tiers].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn);
  const appliedTier = sorted.find((tier) => hoursToCheckIn >= tier.hoursBeforeCheckIn) ?? null;

  if (!appliedTier) {
    return {
      allowed: true,
      refundable: false,
      appliedTier: null,
      penaltyMinor: args.totalMinor,
      refundMinor: 0,
      hoursToCheckIn,
      reason: 'Cancelled inside the free-cancellation window, so no refund is due.',
    };
  }

  const penaltyMinor = applyBasisPoints(args.totalMinor, appliedTier.penaltyBasisPoints);
  const refundMinor = args.totalMinor - penaltyMinor;

  return {
    allowed: true,
    refundable: refundMinor > 0,
    appliedTier,
    penaltyMinor,
    refundMinor,
    hoursToCheckIn,
    reason: appliedTier.label,
  };
}
