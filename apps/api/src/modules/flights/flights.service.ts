import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DEMO_CURRENCY, type FlightSearchResponse } from '@voyago/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { FlightAvailabilityService } from './flight-availability.service';
import type { FlightSearchQueryDto } from './dto/flight.dto';

@Injectable()
export class FlightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: FlightAvailabilityService,
  ) {}

  async listAirports() {
    const airports = await this.prisma.airport.findMany({ orderBy: { city: 'asc' } });
    return airports.map((airport) => ({
      iata: airport.iata,
      name: airport.name,
      city: airport.city,
    }));
  }

  async search(query: FlightSearchQueryDto): Promise<FlightSearchResponse> {
    const { origin, destination, offers } = await this.availability.searchOffers({
      fromIata: query.from,
      toIata: query.to,
      date: query.date,
      adults: query.adults,
      children: query.children,
    });

    const sorted = [...offers];
    switch (query.sort) {
      case 'price_asc':
        sorted.sort((a, b) => a.leadTotalMinor - b.leadTotalMinor);
        break;
      case 'price_desc':
        sorted.sort((a, b) => b.leadTotalMinor - a.leadTotalMinor);
        break;
      case 'duration_asc':
        sorted.sort((a, b) => a.segment.durationMinutes - b.segment.durationMinutes);
        break;
      default:
        // departure_asc is the natural order from the availability query.
        break;
    }

    return {
      searchId: randomUUID(),
      origin: { iata: origin.iata, name: origin.name, city: origin.city },
      destination: { iata: destination.iata, name: destination.name, city: destination.city },
      date: query.date,
      adults: query.adults,
      children: query.children,
      currency: DEMO_CURRENCY,
      items: sorted,
      total: sorted.length,
    };
  }
}
