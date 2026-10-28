import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { PaymentsService } from '../payments/payments.service';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({
  imports: [AvailabilityModule],
  controllers: [BookingsController],
  providers: [BookingsService, PaymentsService],
  exports: [BookingsService, PaymentsService],
})
export class BookingsModule {}
