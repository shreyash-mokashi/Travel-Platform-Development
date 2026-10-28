import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { HotelOffersQueryDto, HotelSearchQueryDto } from '../availability/dto/search.dto';
import { HotelsService } from './hotels.service';

@ApiTags('Hotels')
@Public()
@Controller('hotels')
export class HotelsController {
  constructor(private readonly hotels: HotelsService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search demo hotel inventory',
    description:
      'Returns hotels with at least one bookable offer for the stay, plus filter facets. ' +
      'All inventory is seeded demo data and does not represent live supplier availability.',
  })
  search(@Query() query: HotelSearchQueryDto) {
    return this.hotels.search(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Featured hotels for the home page' })
  featured() {
    return this.hotels.featured();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Hotel detail with priced room offers for the stay' })
  getDetail(@Param('slug') slug: string, @Query() query: HotelOffersQueryDto) {
    return this.hotels.getDetail(slug, query);
  }
}
