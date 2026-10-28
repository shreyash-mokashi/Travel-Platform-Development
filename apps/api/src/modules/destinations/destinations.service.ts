import { Injectable, NotFoundException } from '@nestjs/common';
import type { Destination as DestinationRow } from '@prisma/client';
import type { Destination } from '@voyago/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentService } from '../content/content.service';

@Injectable()
export class DestinationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

  static toDto(row: DestinationRow, hotelCount?: number): Destination {
    return {
      id: row.id,
      slug: row.slug,
      city: row.city,
      state: row.state,
      country: row.country,
      tagline: row.tagline,
      heroImageUrl: row.heroImageUrl,
      ...(hotelCount !== undefined ? { hotelCount } : {}),
    };
  }

  async list(query?: string): Promise<Destination[]> {
    const rows = await this.prisma.destination.findMany({
      where: {
        isActive: true,
        ...(query
          ? {
              OR: [
                { city: { contains: query, mode: 'insensitive' as const } },
                { state: { contains: query, mode: 'insensitive' as const } },
                { slug: { contains: query.toLowerCase() } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { hotels: { where: { isActive: true } } } } },
      orderBy: { city: 'asc' },
    });

    return rows.map((row) => DestinationsService.toDto(row, row._count.hotels));
  }

  /** Resolves a destination by slug, id or city name - whichever the UI sent. */
  async resolve(identifier: string): Promise<DestinationRow> {
    const normalised = identifier.trim();
    const destination = await this.prisma.destination.findFirst({
      where: {
        isActive: true,
        OR: [
          { slug: normalised.toLowerCase() },
          { city: { equals: normalised, mode: 'insensitive' } },
          ...(/^[0-9a-f-]{36}$/i.test(normalised) ? [{ id: normalised }] : []),
        ],
      },
    });

    if (!destination) {
      throw new NotFoundException(`We do not have demo hotels for "${identifier}" yet.`);
    }
    return destination;
  }

  async getBySlug(slug: string) {
    const row = await this.prisma.destination.findFirst({
      where: { slug: slug.toLowerCase(), isActive: true },
      include: { _count: { select: { hotels: { where: { isActive: true } } } } },
    });
    if (!row) throw new NotFoundException('Destination not found.');

    return {
      ...DestinationsService.toDto(row, row._count.hotels),
      content: await this.content.getDestinationContent(row.slug),
    };
  }

  /** Destinations shown on the home page, ordered by inventory depth. */
  async popular(limit = 6): Promise<Destination[]> {
    const all = await this.list();
    return [...all].sort((a, b) => (b.hotelCount ?? 0) - (a.hotelCount ?? 0)).slice(0, limit);
  }
}
