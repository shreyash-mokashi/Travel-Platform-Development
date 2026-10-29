import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateQuoteDto } from './dto/search.dto';
import { QuotesService } from './quotes.service';

@ApiTags('Pricing')
@Public()
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Post()
  @ApiOperation({
    summary: 'Recheck price and hold inventory',
    description:
      'Recalculates an authoritative total server-side. Client-supplied prices are never ' +
      'trusted; expectedTotalMinor is used only to flag a price change to the user.',
  })
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user?: RequestUser) {
    return this.quotes.create(dto, user?.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Re-read and reprice an existing quote' })
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user?: RequestUser) {
    return this.quotes.get(id, user?.id);
  }
}
