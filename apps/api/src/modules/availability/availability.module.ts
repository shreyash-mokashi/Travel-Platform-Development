import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  controllers: [QuotesController],
  providers: [AvailabilityService, QuotesService],
  exports: [AvailabilityService, QuotesService],
})
export class AvailabilityModule {}
