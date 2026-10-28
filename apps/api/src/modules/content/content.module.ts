import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentService } from './content.service';
import {
  DestinationContentDoc,
  DestinationContentSchema,
} from './schemas/destination-content.schema';
import { SupplierSnapshotDoc, SupplierSnapshotSchema } from './schemas/supplier-snapshot.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DestinationContentDoc.name, schema: DestinationContentSchema },
      { name: SupplierSnapshotDoc.name, schema: SupplierSnapshotSchema },
    ]),
  ],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
