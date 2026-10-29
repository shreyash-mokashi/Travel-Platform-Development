import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateFlightQuoteDto } from './dto/flight.dto';
import { FlightQuotesService } from './flight-quotes.service';

@ApiTags('Flight pricing')
@Public()
@Controller('flight-quotes')
export class FlightQuotesController {
  constructor(private readonly quotes: FlightQuotesService) {}

  @Post()
  @ApiOperation({
    summary: 'Recheck a fare and hold seats',
    description:
      'Recalculates an authoritative total server-side. Client-supplied prices are never ' +
      'trusted; expectedTotalMinor is used only to flag a price change to the user.',
  })
  create(@Body() dto: CreateFlightQuoteDto, @CurrentUser() user?: RequestUser) {
    return this.quotes.create(dto, user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Re-read and reprice an existing fare quote' })
  get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.quotes.get(id, user?.id);
  }
}
