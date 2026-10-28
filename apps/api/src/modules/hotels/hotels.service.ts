import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  AMENITY_LABEL,
  DEMO_CURRENCY,
  nightsBetween,
  type AmenityCode,
  type HotelDetail,
  type HotelSearchFacets,
  type HotelSearchResponse,
  type HotelSummary,
  type MealPlan,
  type RoomOffer,
} from '@voyago/shared';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { ContentService } from '../content/content.service';
import { DestinationsService } from '../destinations/destinations.service';
import type { HotelOffersQueryDto, HotelSearchQueryDto } from '../availability/dto/search.dto';

type HotelWithRelations = Prisma.HotelGetPayload<{
  include: { images: true; destination: true };
}>;

/** A hotel plus its priced offers, before filtering and sorting. */
interface PricedHotel {
  hotel: HotelWithRelations;
  offers: RoomOffer[];
  leadOffer: RoomOffer;
}

@Injectable()
export class HotelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly destinations: DestinationsService,
    private readonly content: ContentService,
  ) {}

  async search(query: HotelSearchQueryDto): Promise<HotelSearchResponse> {
    const destination = await this.destinations.resolve(query.destination);
    const nights = nightsBetween(query.checkIn, query.checkOut);

    const hotels = await this.prisma.hotel.findMany({
      where: { destinationId: destination.id, isActive: true },
      include: { images: { orderBy: { position: 'asc' } }, destination: true },
    });

    const offersByHotel = await this.availability.getOffersByHotel({
      hotelIds: hotels.map((hotel) => hotel.id),
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      rooms: query.rooms,
      adults: query.adults,
      children: query.children,
    });

    // Only hotels with at least one sellable offer reach the results list.
    const priced: PricedHotel[] = [];
    for (const hotel of hotels) {
      const offers = offersByHotel.get(hotel.id) ?? [];
      if (offers.length === 0) continue;
      const leadOffer = offers.reduce((cheapest, offer) =>
        offer.price.totalMinor < cheapest.price.totalMinor ? offer : cheapest,
      );
      priced.push({ hotel, offers, leadOffer });
    }

    const facets = HotelsService.buildFacets(priced);
    const filtered = priced.filter((entry) => HotelsService.matchesFilters(entry, query));
    const sorted = HotelsService.sortHotels(filtered, query.sort);

    const total = sorted.length;
    const start = (query.page - 1) * query.pageSize;
    const pageItems = sorted.slice(start, start + query.pageSize);

    return {
      searchId: randomUUID(),
      destination: DestinationsService.toDto(destination),
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      nights,
      rooms: query.rooms,
      adults: query.adults,
      children: query.children,
      currency: DEMO_CURRENCY,
      facets,
      items: pageItems.map((entry) => HotelsService.toSummary(entry, nights)),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async getDetail(slug: string, query: HotelOffersQueryDto): Promise<HotelDetail> {
    const hotel = await this.prisma.hotel.findFirst({
      where: { slug: slug.toLowerCase(), isActive: true },
      include: { images: { orderBy: { position: 'asc' } }, destination: true },
    });
    if (!hotel) throw new NotFoundException('Hotel not found.');

    const offers = await this.availability.getOffersForHotel(hotel.id, {
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      rooms: query.rooms,
      adults: query.adults,
      children: query.children,
    });

    const nights = nightsBetween(query.checkIn, query.checkOut);
    const leadOffer =
      offers.length > 0
        ? offers.reduce((cheapest, offer) =>
            offer.price.totalMinor < cheapest.price.totalMinor ? offer : cheapest,
          )
        : null;

    const summary = HotelsService.toSummary(
      { hotel, offers, leadOffer: leadOffer ?? ({} as RoomOffer) },
      nights,
    );

    return {
      ...summary,
      leadPriceMinor: leadOffer ? leadOffer.price.totalMinor : null,
      leadPricePerNightMinor: leadOffer
        ? Math.round(leadOffer.price.totalMinor / Math.max(1, nights))
        : null,
      description: hotel.description,
      checkInTime: hotel.checkInTime,
      checkOutTime: hotel.checkOutTime,
      latitude: Number(hotel.latitude),
      longitude: Number(hotel.longitude),
      phone: hotel.phone,
      policies: hotel.policies,
      offers: [...offers].sort((a, b) => a.price.totalMinor - b.price.totalMinor),
      content: await this.content.getDestinationContent(hotel.destination.slug),
    };
  }

  /** Featured hotels for the home page - highest rated across destinations. */
  async featured(limit = 6): Promise<HotelSummary[]> {
    const hotels = await this.prisma.hotel.findMany({
      where: { isActive: true },
      include: { images: { orderBy: { position: 'asc' } }, destination: true },
      orderBy: [{ guestRating: 'desc' }, { starRating: 'desc' }],
      take: limit,
    });

    return hotels.map((hotel) =>
      HotelsService.toSummary({ hotel, offers: [], leadOffer: {} as RoomOffer }, 1),
    );
  }

  private static toSummary(entry: PricedHotel, nights: number): HotelSummary {
    const { hotel, offers, leadOffer } = entry;
    const hasLead = Boolean(leadOffer?.price);

    return {
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      starRating: hotel.starRating,
      guestRating: Number(hotel.guestRating),
      reviewCount: hotel.reviewCount,
      addressLine: hotel.addressLine,
      locality: hotel.locality,
      destination: {
        id: hotel.destination.id,
        slug: hotel.destination.slug,
        city: hotel.destination.city,
        state: hotel.destination.state,
      },
      images: hotel.images.map((image) => ({
        url: image.url,
        alt: image.alt,
        position: image.position,
      })),
      amenities: hotel.amenities,
      shortDescription: hotel.shortDescription,
      leadPriceMinor: hasLead ? leadOffer.price.totalMinor : null,
      leadPricePerNightMinor: hasLead
        ? Math.round(leadOffer.price.totalMinor / Math.max(1, nights))
        : null,
      freeCancellationAvailable: offers.some(
        (offer) => offer.ratePlan.cancellationPolicy.refundable,
      ),
    };
  }

  private static matchesFilters(entry: PricedHotel, query: HotelSearchQueryDto): boolean {
    const total = entry.leadOffer.price.totalMinor;

    if (query.minPriceMinor !== undefined && total < query.minPriceMinor) return false;
    if (query.maxPriceMinor !== undefined && total > query.maxPriceMinor) return false;

    if (query.starRatings?.length && !query.starRatings.includes(entry.hotel.starRating)) {
      return false;
    }

    if (query.amenities?.length) {
      const owned = new Set(entry.hotel.amenities);
      if (!query.amenities.every((code) => owned.has(code))) return false;
    }

    if (query.mealPlans?.length) {
      const plans = new Set(entry.offers.map((offer) => offer.ratePlan.mealPlan));
      if (!query.mealPlans.some((plan) => plans.has(plan))) return false;
    }

    if (query.freeCancellation) {
      const refundable = entry.offers.some((offer) => offer.ratePlan.cancellationPolicy.refundable);
      if (!refundable) return false;
    }

    return true;
  }

  private static sortHotels(entries: PricedHotel[], sort: string): PricedHotel[] {
    const byPrice = (a: PricedHotel, b: PricedHotel) =>
      a.leadOffer.price.totalMinor - b.leadOffer.price.totalMinor;

    switch (sort) {
      case 'price_asc':
        return [...entries].sort(byPrice);
      case 'price_desc':
        return [...entries].sort((a, b) => byPrice(b, a));
      case 'rating_desc':
        return [...entries].sort(
          (a, b) => Number(b.hotel.guestRating) - Number(a.hotel.guestRating),
        );
      default:
        // Relevance blends guest sentiment with star class, then price.
        return [...entries].sort((a, b) => {
          const score = (entry: PricedHotel) =>
            Number(entry.hotel.guestRating) * 2 + entry.hotel.starRating;
          const diff = score(b) - score(a);
          return diff !== 0 ? diff : byPrice(a, b);
        });
    }
  }

  /**
   * Facets describe the unfiltered result set so the sidebar counts stay
   * stable while the user ticks boxes.
   */
  private static buildFacets(entries: PricedHotel[]): HotelSearchFacets {
    const totals = entries.map((entry) => entry.leadOffer.price.totalMinor);
    const starCounts = new Map<number, number>();
    const amenityCounts = new Map<string, number>();
    const mealPlanCounts = new Map<MealPlan, number>();
    let freeCancellationCount = 0;

    for (const entry of entries) {
      starCounts.set(entry.hotel.starRating, (starCounts.get(entry.hotel.starRating) ?? 0) + 1);
      for (const amenity of entry.hotel.amenities) {
        amenityCounts.set(amenity, (amenityCounts.get(amenity) ?? 0) + 1);
      }
      const plans = new Set(entry.offers.map((offer) => offer.ratePlan.mealPlan));
      for (const plan of plans) {
        mealPlanCounts.set(plan, (mealPlanCounts.get(plan) ?? 0) + 1);
      }
      if (entry.offers.some((offer) => offer.ratePlan.cancellationPolicy.refundable)) {
        freeCancellationCount += 1;
      }
    }

    return {
      priceMinMinor: totals.length ? Math.min(...totals) : null,
      priceMaxMinor: totals.length ? Math.max(...totals) : null,
      starRatings: [...starCounts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.value - a.value),
      amenities: [...amenityCounts.entries()]
        .map(([code, count]) => ({
          code,
          label: AMENITY_LABEL[code as AmenityCode] ?? code,
          count,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
      mealPlans: [...mealPlanCounts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count),
      freeCancellationCount,
    };
  }
}
