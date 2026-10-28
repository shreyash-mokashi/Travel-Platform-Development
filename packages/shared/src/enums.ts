export const BOOKING_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_PROCESSING: 'PAYMENT_PROCESSING',
  CONFIRMED: 'CONFIRMED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  CANCELLATION_REQUESTED: 'CANCELLATION_REQUESTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const PAYMENT_STATUS = {
  INITIATED: 'INITIATED',
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const REFUND_STATUS = {
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  REQUESTED: 'REQUESTED',
  PENDING: 'PENDING',
  REFUNDED: 'REFUNDED',
  REJECTED: 'REJECTED',
} as const;
export type RefundStatus = (typeof REFUND_STATUS)[keyof typeof REFUND_STATUS];

/** Test scenarios the payment simulator understands. */
export const PAYMENT_SCENARIO = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  PENDING: 'PENDING',
} as const;
export type PaymentScenario = (typeof PAYMENT_SCENARIO)[keyof typeof PAYMENT_SCENARIO];

export const USER_ROLE = { CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN' } as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const MEAL_PLAN = {
  ROOM_ONLY: 'ROOM_ONLY',
  BREAKFAST: 'BREAKFAST',
  HALF_BOARD: 'HALF_BOARD',
  FULL_BOARD: 'FULL_BOARD',
} as const;
export type MealPlan = (typeof MEAL_PLAN)[keyof typeof MEAL_PLAN];

export const MEAL_PLAN_LABEL: Record<MealPlan, string> = {
  ROOM_ONLY: 'Room only',
  BREAKFAST: 'Breakfast included',
  HALF_BOARD: 'Breakfast + dinner',
  FULL_BOARD: 'All meals included',
};

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  PAYMENT_PROCESSING: 'Payment processing',
  CONFIRMED: 'Confirmed',
  PAYMENT_FAILED: 'Payment failed',
  CANCELLATION_REQUESTED: 'Cancellation requested',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

/**
 * Allowed booking state transitions. The API validates every change against
 * this map, so a client can never push a booking into an arbitrary state.
 */
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING_PAYMENT: ['PAYMENT_PROCESSING', 'CANCELLED', 'EXPIRED'],
  PAYMENT_PROCESSING: ['CONFIRMED', 'PAYMENT_FAILED', 'PENDING_PAYMENT'],
  PAYMENT_FAILED: ['PAYMENT_PROCESSING', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CANCELLATION_REQUESTED', 'CANCELLED'],
  CANCELLATION_REQUESTED: ['CANCELLED', 'CONFIRMED'],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}
