import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { DestinationsModule } from '../destinations/destinations.module';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';

@Module({
  imports: [AvailabilityModule, DestinationsModule],
  controllers: [HotelsController],
  providers: [HotelsService],
  exports: [HotelsService],
})
export class HotelsModule {}
