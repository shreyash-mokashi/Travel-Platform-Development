import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, Quote } from '@prisma/client';
import {
  DEMO_CURRENCY,
  QUOTE_TTL_MINUTES,
  nightsBetween,
  type QuoteResponse,
  type RoomOffer,
} from '@voyago/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { fromDbDate, toDbDate } from '../../common/utils/dates';
import { ContentService } from '../content/content.service';
import { AvailabilityService } from './availability.service';
import type { CreateQuoteDto } from './dto/search.dto';

/**
 * Quotes are the server-side price recheck. A quote freezes an authoritative
 * total, holds inventory softly until it expires, and is the only thing a
 * booking may be created from.
 */
@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly content: ContentService,
  ) {}

  async create(dto: CreateQuoteDto, userId?: string): Promise<QuoteResponse> {
    const offer = await this.availability.findOffer({
      hotelId: dto.hotelId,
      roomId: dto.roomId,
      ratePlanId: dto.ratePlanId,
      request: {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        rooms: dto.rooms,
        adults: dto.adults,
        children: dto.children,
      },
    });

    if (!offer) {
      throw new BadRequestException(
        'That room is no longer available for these dates. Please choose another option.',
      );
    }

    const quote = await this.prisma.quote.create({
      data: {
        userId: userId ?? null,
        hotelId: dto.hotelId,
        roomId: dto.roomId,
        ratePlanId: dto.ratePlanId,
        checkIn: toDbDate(dto.checkIn),
        checkOut: toDbDate(dto.checkOut),
        rooms: dto.rooms,
        adults: dto.adults,
        children: dto.children,
        totalMinor: offer.price.totalMinor,
        breakdown: offer.price as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000),
      },
    });

    await this.content.recordSnapshot({
      correlationId: quote.id,
      kind: 'QUOTE',
      hotelId: dto.hotelId,
      roomId: dto.roomId,
      ratePlanId: dto.ratePlanId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
      totalMinor: offer.price.totalMinor,
      payload: { offer } as unknown as Record<string, unknown>,
    });

    const priceChanged =
      dto.expectedTotalMinor !== undefined && dto.expectedTotalMinor !== offer.price.totalMinor;

    return this.toResponse(quote, offer, priceChanged, dto.expectedTotalMinor ?? null);
  }

  /** Re-reads a quote and reprices it, so an expired hold is caught early. */
  async get(quoteId: string, userId?: string): Promise<QuoteResponse> {
    const quote = await this.loadQuote(quoteId, userId);

    if (quote.consumedAt) {
      throw new BadRequestException('This quote has already been used for a booking.');
    }
    if (quote.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Your price hold has expired. Please search again to see current prices.',
      );
    }

    const offer = await this.availability.findOffer({
      hotelId: quote.hotelId,
      roomId: quote.roomId,
      ratePlanId: quote.ratePlanId,
      request: {
        checkIn: fromDbDate(quote.checkIn),
        checkOut: fromDbDate(quote.checkOut),
        rooms: quote.rooms,
        adults: quote.adults,
        children: quote.children,
        excludeQuoteId: quote.id,
      },
    });

    if (!offer) {
      throw new BadRequestException(
        'That room is no longer available for these dates. Please choose another option.',
      );
    }

    const priceChanged = offer.price.totalMinor !== quote.totalMinor;
    if (priceChanged) {
      await this.prisma.quote.update({
        where: { id: quote.id },
        data: {
          totalMinor: offer.price.totalMinor,
          breakdown: offer.price as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return this.toResponse(quote, offer, priceChanged, quote.totalMinor);
  }

  async loadQuote(quoteId: string, userId?: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Price quote not found.');
    // A quote created while signed in belongs to that user only.
    if (quote.userId && userId && quote.userId !== userId) {
      throw new NotFoundException('Price quote not found.');
    }
    return quote;
  }

  private async toResponse(
    quote: Quote,
    offer: RoomOffer,
    priceChanged: boolean,
    previousTotalMinor: number | null,
  ): Promise<QuoteResponse> {
    const hotel = await this.prisma.hotel.findUniqueOrThrow({
      where: { id: quote.hotelId },
      include: { images: { orderBy: { position: 'asc' } }, destination: true },
    });

    const checkIn = fromDbDate(quote.checkIn);
    const checkOut = fromDbDate(quote.checkOut);

    return {
      quoteId: quote.id,
      expiresAt: quote.expiresAt.toISOString(),
      hotel: {
        id: hotel.id,
        slug: hotel.slug,
        name: hotel.name,
        starRating: hotel.starRating,
        addressLine: hotel.addressLine,
        images: hotel.images.map((image) => ({
          url: image.url,
          alt: image.alt,
          position: image.position,
        })),
      },
      destination: { city: hotel.destination.city, state: hotel.destination.state },
      offer,
      checkIn,
      checkOut,
      nights: nightsBetween(checkIn, checkOut),
      rooms: quote.rooms,
      adults: quote.adults,
      children: quote.children,
      currency: DEMO_CURRENCY,
      priceChanged,
      previousTotalMinor,
    };
  }
}
