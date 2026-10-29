import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { ResolvePendingPaymentDto, SimulatePaymentDto } from '../payments/dto/payment.dto';
import { CancelFlightBookingDto, CreateFlightBookingDto } from './dto/flight.dto';
import { FlightBookingsService } from './flight-bookings.service';
import { FlightPaymentsService } from './flight-payments.service';

@ApiTags('Flight bookings')
@ApiBearerAuth()
@Controller('flight-bookings')
export class FlightBookingsController {
  constructor(
    private readonly bookings: FlightBookingsService,
    private readonly payments: FlightPaymentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a pending flight booking from a fare quote',
    description:
      'The total is recalculated from the quote server-side. Any price or fare detail in ' +
      'the request body other than the quote id is ignored.',
  })
  @ApiResponse({ status: 201, description: 'Booking created in PENDING_PAYMENT state.' })
  @ApiResponse({ status: 409, description: 'Quote already used or seats sold out.' })
  create(@Body() dto: CreateFlightBookingDto, @CurrentUser() user: RequestUser) {
    return this.bookings.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: "The signed-in user's flight bookings" })
  list(@CurrentUser() user: RequestUser) {
    return this.bookings.listForUser(user.id);
  }

  @Get(':idOrReference')
  @ApiOperation({ summary: 'One flight booking, by id or VYF reference' })
  findOne(@Param('idOrReference') idOrReference: string, @CurrentUser() user: RequestUser) {
    return this.bookings.findOneForUser(idOrReference, user.id);
  }

  @Post(':idOrReference/cancellation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a flight booking under its fare rules' })
  cancel(
    @Param('idOrReference') idOrReference: string,
    @Body() dto: CancelFlightBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.cancel(idOrReference, user.id, dto);
  }

  @Post(':idOrReference/payments')
  @ApiOperation({
    summary: 'Run a demo payment',
    description:
      'Demo Payment — No real money is charged. The outcome is derived from the requested ' +
      'scenario on the server; replaying an idempotency key returns the original attempt.',
  })
  pay(
    @Param('idOrReference') idOrReference: string,
    @Body() dto: SimulatePaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.payments.simulate(idOrReference, dto, user.id);
  }

  @Post(':idOrReference/payments/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a deliberately pending demo payment' })
  resolve(
    @Param('idOrReference') idOrReference: string,
    @Body() dto: ResolvePendingPaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.payments.resolvePending(idOrReference, dto, user.id);
  }
}
