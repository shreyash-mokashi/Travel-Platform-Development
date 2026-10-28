import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class ContentHighlight {
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) body: string;
}

@Schema({ _id: false })
export class ContentNeighbourhood {
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) summary: string;
}

@Schema({ _id: false })
export class ContentFaq {
  @Prop({ required: true }) question: string;
  @Prop({ required: true }) answer: string;
}

/**
 * Editorial destination content. It is free-form, revised independently of the
 * booking schema and never participates in a transaction, which is why it
 * lives in MongoDB rather than in PostgreSQL.
 */
@Schema({ collection: 'destination_content', timestamps: true })
export class DestinationContentDoc {
  @Prop({ required: true, unique: true, index: true })
  destinationSlug: string;

  @Prop({ required: true }) headline: string;
  @Prop({ required: true }) intro: string;
  @Prop({ type: [ContentHighlight], default: [] }) highlights: ContentHighlight[];
  @Prop({ required: true }) bestTimeToVisit: string;
  @Prop({ type: [ContentNeighbourhood], default: [] }) neighbourhoods: ContentNeighbourhood[];
  @Prop({ type: [ContentFaq], default: [] }) faqs: ContentFaq[];
}

export type DestinationContentDocument = HydratedDocument<DestinationContentDoc>;
export const DestinationContentSchema = SchemaFactory.createForClass(DestinationContentDoc);
