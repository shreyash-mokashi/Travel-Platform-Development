import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { DestinationContent } from '@voyago/shared';
import {
  DestinationContentDoc,
  type DestinationContentDocument,
} from './schemas/destination-content.schema';
import { SupplierSnapshotDoc } from './schemas/supplier-snapshot.schema';

/**
 * Content and audit-snapshot access. Every read degrades gracefully: if Mongo
 * is unavailable the booking flow continues without editorial content.
 */
@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectModel(DestinationContentDoc.name)
    private readonly contentModel: Model<DestinationContentDocument>,
    @InjectModel(SupplierSnapshotDoc.name)
    private readonly snapshotModel: Model<SupplierSnapshotDoc>,
  ) {}

  async getDestinationContent(slug: string): Promise<DestinationContent | null> {
    try {
      const doc = await this.contentModel.findOne({ destinationSlug: slug }).lean().exec();
      if (!doc) return null;
      return {
        destinationSlug: doc.destinationSlug,
        headline: doc.headline,
        intro: doc.intro,
        highlights: doc.highlights ?? [],
        bestTimeToVisit: doc.bestTimeToVisit,
        neighbourhoods: doc.neighbourhoods ?? [],
        faqs: doc.faqs ?? [],
        updatedAt: (doc as { updatedAt?: Date }).updatedAt?.toISOString() ?? '',
      };
    } catch (error) {
      this.logger.warn(`Destination content unavailable for "${slug}": ${String(error)}`);
      return null;
    }
  }

  async listDestinationSlugs(): Promise<string[]> {
    try {
      const docs = await this.contentModel.find({}, { destinationSlug: 1 }).lean().exec();
      return docs.map((doc) => doc.destinationSlug);
    } catch {
      return [];
    }
  }

  /** Writes an immutable pricing snapshot. Failures never break a booking. */
  async recordSnapshot(input: {
    correlationId: string;
    kind: 'QUOTE' | 'BOOKING';
    hotelId: string;
    roomId: string;
    ratePlanId: string;
    checkIn: string;
    checkOut: string;
    totalMinor: number;
    payload: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.snapshotModel.create(input);
    } catch (error) {
      this.logger.warn(`Failed to persist supplier snapshot: ${String(error)}`);
    }
  }

  async countSnapshots(): Promise<number> {
    try {
      return await this.snapshotModel.countDocuments().exec();
    } catch {
      return 0;
    }
  }
}
