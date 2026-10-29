import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { FlightQuote, Prisma } from '@prisma/client';
import { DEMO_CURRENCY, QUOTE_TTL_MINUTES, type FlightQuoteView } from '@voyago/shared';
import { fromDbDate, toDbDate } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateFlightQuoteDto } from './dto/flight.dto';
import { FlightAvailabilityService } from './flight-availability.service';

/**
 * Flight quotes mirror hotel quotes: a server-side fare recheck that freezes
 * an authoritative total, holds seats softly until expiry, and is the only
 * thing a flight booking may be created from.
 */
@Injectable()
export class FlightQuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: FlightAvailabilityService,
  ) {}

  async create(dto: CreateFlightQuoteDto, userId?: string): Promise<FlightQuoteView> {
    this.availability.assertSearchableDate(dto.date);

    const offer = await this.availability.findFareOffer({
      flightId: dto.flightId,
      fareClassId: dto.fareClassId,
      date: dto.date,
      adults: dto.adults,
      children: dto.children,
    });
    if (!offer) {
      throw new BadRequestException(
        'That fare is no longer available for this flight. Please choose another option.',
      );
    }

    const quote = await this.prisma.flightQuote.create({
      data: {
        userId: userId ?? null,
        flightId: dto.flightId,
        fareClassId: dto.fareClassId,
        date: toDbDate(dto.date),
        adults: dto.adults,
        children: dto.children,
        totalMinor: offer.fare.price.totalMinor,
        breakdown: offer.fare.price as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000),
      },
    });

    const priceChanged =
      dto.expectedTotalMinor !== undefined &&
      dto.expectedTotalMinor !== offer.fare.price.totalMinor;

    return this.toView(quote, offer, priceChanged, dto.expectedTotalMinor ?? null);
  }

  /** Re-reads a quote and reprices it, so an expired hold is caught early. */
  async get(quoteId: string, userId?: string): Promise<FlightQuoteView> {
    const quote = await this.loadQuote(quoteId, userId);

    if (quote.consumedAt) {
      throw new BadRequestException('This quote has already been used for a booking.');
    }
    if (quote.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Your fare hold has expired. Please search again to see current prices.',
      );
    }

    const offer = await this.availability.findFareOffer({
      flightId: quote.flightId,
      fareClassId: quote.fareClassId,
      date: fromDbDate(quote.date),
      adults: quote.adults,
      children: quote.children,
      excludeQuoteId: quote.id,
    });
    if (!offer) {
      throw new BadRequestException('That fare sold out while you were away. Please search again.');
    }

    const priceChanged = offer.fare.price.totalMinor !== quote.totalMinor;
    if (priceChanged) {
      await this.prisma.flightQuote.update({
        where: { id: quote.id },
        data: {
          totalMinor: offer.fare.price.totalMinor,
          breakdown: offer.fare.price as unknown as Prisma.InputJsonValue,
        },
      });
    }

    return this.toView(quote, offer, priceChanged, quote.totalMinor);
  }

  async loadQuote(quoteId: string, userId?: string): Promise<FlightQuote> {
    const quote = await this.prisma.flightQuote.findUnique({ where: { id: quoteId } });
    if (!quote) throw new NotFoundException('Fare quote not found.');
    // A quote created while signed in belongs to that user only.
    if (quote.userId && userId && quote.userId !== userId) {
      throw new NotFoundException('Fare quote not found.');
    }
    return quote;
  }

  private toView(
    quote: FlightQuote,
    offer: NonNullable<Awaited<ReturnType<FlightAvailabilityService['findFareOffer']>>>,
    priceChanged: boolean,
    previousTotalMinor: number | null,
  ): FlightQuoteView {
    return {
      quoteId: quote.id,
      expiresAt: quote.expiresAt.toISOString(),
      segment: offer.segment,
      fare: offer.fare,
      adults: quote.adults,
      children: quote.children,
      currency: DEMO_CURRENCY,
      priceChanged,
      previousTotalMinor,
    };
  }
}
