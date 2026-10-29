import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { FlightSearchQueryDto } from './dto/flight.dto';
import { FlightsService } from './flights.service';

@ApiTags('Flights')
@Public()
@Controller('flights')
export class FlightsController {
  constructor(private readonly flights: FlightsService) {}

  @Get('airports')
  @ApiOperation({ summary: 'Airports served by the demo network' })
  airports() {
    return this.flights.listAirports();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search one-way flights for a date',
    description:
      'Returns every operating flight on the route with its sellable fare families. All ' +
      'inventory is seeded demo data and every airline is fictional.',
  })
  search(@Query() query: FlightSearchQueryDto) {
    return this.flights.search(query);
  }
}
