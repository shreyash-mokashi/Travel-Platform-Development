import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { ResolvePendingPaymentDto, SimulatePaymentDto } from '../payments/dto/payment.dto';
import { PaymentsService } from '../payments/payments.service';
import { BookingsService } from './bookings.service';
import { BookingListQueryDto, CancelBookingDto, CreateBookingDto } from './dto/booking.dto';

@ApiTags('Bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a pending booking from a price quote',
    description:
      'The total is recalculated from the quote server-side. Any price or room detail in ' +
      'the request body other than the quote id is ignored.',
  })
  @ApiResponse({ status: 201, description: 'Booking created in PENDING_PAYMENT state.' })
  @ApiResponse({ status: 409, description: 'Quote already used or inventory sold out.' })
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: RequestUser) {
    return this.bookings.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: "List the signed-in customer's bookings" })
  list(@Query() query: BookingListQueryDto, @CurrentUser() user: RequestUser) {
    return this.bookings.listForUser(user.id, query);
  }

  @Get(':idOrReference')
  @ApiOperation({ summary: 'Booking detail by id or booking reference' })
  @ApiResponse({ status: 404, description: 'Not found, or not owned by the caller.' })
  findOne(@Param('idOrReference') idOrReference: string, @CurrentUser() user: RequestUser) {
    return this.bookings.findOneForUser(idOrReference, user.id);
  }

  @Post(':idOrReference/payments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run a demo payment against a booking',
    description: 'Demo Payment — No real money is charged. No card details are accepted.',
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
  @ApiOperation({ summary: 'Resolve a pending demo payment' })
  resolve(
    @Param('idOrReference') idOrReference: string,
    @Body() dto: ResolvePendingPaymentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.payments.resolvePending(idOrReference, dto, user.id);
  }

  @Post(':idOrReference/cancellation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request cancellation and run the refund simulation',
    description:
      'The seeded cancellation policy decides the refund. Refunds are simulated only - ' +
      'no money moves.',
  })
  cancel(
    @Param('idOrReference') idOrReference: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.bookings.cancel(idOrReference, user.id, dto);
  }
}
