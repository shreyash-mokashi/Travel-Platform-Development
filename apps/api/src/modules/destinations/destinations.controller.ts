import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { DestinationsService } from './destinations.service';

@ApiTags('Destinations')
@Public()
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinations: DestinationsService) {}

  @Get()
  @ApiOperation({ summary: 'List demo destinations, optionally filtered for autocomplete' })
  @ApiQuery({ name: 'q', required: false })
  list(@Query('q') query?: string) {
    return this.destinations.list(query?.trim() || undefined);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Destinations featured on the home page' })
  popular() {
    return this.destinations.popular();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Destination detail with MongoDB editorial content' })
  getBySlug(@Param('slug') slug: string) {
    return this.destinations.getBySlug(slug);
  }
}
