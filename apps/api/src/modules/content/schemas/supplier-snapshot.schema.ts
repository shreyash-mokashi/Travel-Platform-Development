import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/**
 * An append-only record of exactly what the pricing engine returned at quote
 * and booking time. Shape varies by supplier and must never be mutated, so a
 * document store is a better fit than a relational table.
 */
@Schema({ collection: 'supplier_snapshots', timestamps: { createdAt: true, updatedAt: false } })
export class SupplierSnapshotDoc {
  @Prop({ required: true, index: true }) correlationId: string;
  @Prop({ required: true, index: true }) kind: 'QUOTE' | 'BOOKING';
  @Prop({ required: true }) hotelId: string;
  @Prop({ required: true }) roomId: string;
  @Prop({ required: true }) ratePlanId: string;
  @Prop({ required: true }) checkIn: string;
  @Prop({ required: true }) checkOut: string;
  @Prop({ required: true }) totalMinor: number;
  @Prop({ type: Object, required: true }) payload: Record<string, unknown>;
}

export type SupplierSnapshotDocument = HydratedDocument<SupplierSnapshotDoc>;
export const SupplierSnapshotSchema = SchemaFactory.createForClass(SupplierSnapshotDoc);
