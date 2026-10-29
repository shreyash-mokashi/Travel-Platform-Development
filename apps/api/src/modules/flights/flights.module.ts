import { Module } from '@nestjs/common';
import { FlightAvailabilityService } from './flight-availability.service';
import { FlightBookingsController } from './flight-bookings.controller';
import { FlightBookingsService } from './flight-bookings.service';
import { FlightPaymentsService } from './flight-payments.service';
import { FlightQuotesController } from './flight-quotes.controller';
import { FlightQuotesService } from './flight-quotes.service';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';

@Module({
  controllers: [FlightsController, FlightQuotesController, FlightBookingsController],
  providers: [
    FlightAvailabilityService,
    FlightsService,
    FlightQuotesService,
    FlightBookingsService,
    FlightPaymentsService,
  ],
  exports: [FlightBookingsService],
})
export class FlightsModule {}
