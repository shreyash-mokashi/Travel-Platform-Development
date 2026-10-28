import type { CancellationPolicy } from './cancellation';
import type { HotelSortOption } from './constants';
import type {
  BookingStatus,
  MealPlan,
  PaymentScenario,
  PaymentStatus,
  RefundStatus,
  UserRole,
} from './enums';
import type { PriceBreakdown } from './pricing';

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
  timestamp: string;
  path: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Destination {
  id: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  tagline: string;
  heroImageUrl: string;
  hotelCount?: number;
}

export interface HotelImage {
  url: string;
  alt: string;
  position: number;
}

export interface HotelSummary {
  id: string;
  slug: string;
  name: string;
  starRating: number;
  guestRating: number;
  reviewCount: number;
  addressLine: string;
  locality: string;
  destination: Pick<Destination, 'id' | 'slug' | 'city' | 'state'>;
  images: HotelImage[];
  amenities: string[];
  shortDescription: string;
  /** Lowest available total for the searched stay, in minor units. */
  leadPriceMinor: number | null;
  leadPricePerNightMinor: number | null;
  freeCancellationAvailable: boolean;
}

export interface RatePlanSummary {
  id: string;
  code: string;
  name: string;
  mealPlan: MealPlan;
  description: string;
  discountBasisPoints: number;
  supplementBasisPoints: number;
  cancellationPolicy: CancellationPolicy;
}

export interface RoomOffer {
  roomId: string;
  roomName: string;
  roomDescription: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  sizeSqm: number;
  bedType: string;
  images: HotelImage[];
  amenities: string[];
  ratePlan: RatePlanSummary;
  roomsAvailable: number;
  price: PriceBreakdown;
}

export interface HotelDetail extends HotelSummary {
  description: string;
  checkInTime: string;
  checkOutTime: string;
  latitude: number;
  longitude: number;
  phone: string;
  policies: string[];
  offers: RoomOffer[];
  content?: DestinationContent | null;
}

export interface DestinationContent {
  destinationSlug: string;
  headline: string;
  intro: string;
  highlights: { title: string; body: string }[];
  bestTimeToVisit: string;
  neighbourhoods: { name: string; summary: string }[];
  faqs: { question: string; answer: string }[];
  updatedAt: string;
}

export interface HotelSearchQuery {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  page?: number;
  pageSize?: number;
  sort?: HotelSortOption;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  starRatings?: number[];
  amenities?: string[];
  mealPlans?: MealPlan[];
  freeCancellation?: boolean;
}

export interface HotelSearchFacets {
  priceMinMinor: number | null;
  priceMaxMinor: number | null;
  starRatings: { value: number; count: number }[];
  amenities: { code: string; label: string; count: number }[];
  mealPlans: { value: MealPlan; count: number }[];
  freeCancellationCount: number;
}

export interface HotelSearchResponse extends Paginated<HotelSummary> {
  searchId: string;
  destination: Destination;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  facets: HotelSearchFacets;
  currency: string;
}

export interface QuoteResponse {
  quoteId: string;
  expiresAt: string;
  hotel: Pick<HotelSummary, 'id' | 'slug' | 'name' | 'starRating' | 'addressLine' | 'images'>;
  destination: Pick<Destination, 'city' | 'state'>;
  offer: RoomOffer;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  currency: string;
  /** True when the price moved since the figure shown in search results. */
  priceChanged: boolean;
  previousTotalMinor: number | null;
}

export interface GuestInput {
  firstName: string;
  lastName: string;
  isLeadGuest: boolean;
}

export interface BookingContact {
  email: string;
  phone: string;
}

export interface PaymentAttemptView {
  id: string;
  scenario: PaymentScenario;
  status: PaymentStatus;
  amountMinor: number;
  failureReason: string | null;
  createdAt: string;
  settledAt: string | null;
}

export interface BookingStatusEventView {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  note: string | null;
  createdAt: string;
}

export interface BookingView {
  id: string;
  reference: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  refundStatus: RefundStatus;
  currency: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: number;
  adults: number;
  children: number;
  hotel: {
    id: string;
    slug: string;
    name: string;
    starRating: number;
    addressLine: string;
    locality: string;
    city: string;
    state: string;
    checkInTime: string;
    checkOutTime: string;
    phone: string;
    imageUrl: string | null;
  };
  roomName: string;
  ratePlanName: string;
  mealPlan: MealPlan;
  cancellationPolicy: CancellationPolicy;
  priceSnapshot: PriceBreakdown;
  totalMinor: number;
  refundMinor: number | null;
  contact: BookingContact;
  specialRequests: string | null;
  guests: GuestInput[];
  paymentAttempts: PaymentAttemptView[];
  statusHistory: BookingStatusEventView[];
  cancellationPreview?: {
    refundMinor: number;
    penaltyMinor: number;
    reason: string;
  } | null;
  paymentDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}
