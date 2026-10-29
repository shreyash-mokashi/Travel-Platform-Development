import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type RequestUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import {
  AdminAuditQueryDto,
  AdminBookingQueryDto,
  UpdateInventoryDto,
  UpdateRatePlanDto,
  UpdateRoomDto,
  UpdateHotelDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard metrics aggregated from the database' })
  overview() {
    return this.admin.overview();
  }

  @Get('bookings')
  @ApiOperation({ summary: 'All bookings, with status and free-text filters' })
  listBookings(@Query() query: AdminBookingQueryDto) {
    return this.admin.listBookings(query);
  }

  @Get('bookings/:idOrReference')
  @ApiOperation({ summary: 'Inspect any booking' })
  getBooking(@Param('idOrReference') idOrReference: string) {
    return this.admin.getBooking(idOrReference);
  }

  @Get('hotels')
  @ApiOperation({ summary: 'Hotel inventory list' })
  listHotels(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.admin.listHotels(Number(page) || 1, Number(pageSize) || 20);
  }

  @Get('hotels/:id/inventory')
  @ApiOperation({ summary: 'Rooms, rate plans and nightly inventory for a hotel' })
  getHotelInventory(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.admin.getHotelInventory(id);
  }

  @Patch('hotels/:id')
  @ApiOperation({ summary: 'Update hotel details' })
  updateHotel(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateHotelDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updateHotel(id, dto, user.id);
  }

  @Patch('rooms/:id')
  @ApiOperation({ summary: 'Update a room type' })
  updateRoom(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updateRoom(id, dto, user.id);
  }

  @Patch('rate-plans/:id')
  @ApiOperation({ summary: 'Update a rate plan' })
  updateRatePlan(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRatePlanDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updateRatePlan(id, dto, user.id);
  }

  @Patch('rooms/:id/inventory')
  @ApiOperation({ summary: 'Bulk update availability and nightly tariff' })
  updateInventory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateInventoryDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.updateInventory(id, dto, user.id);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'Simulated refund records' })
  listRefunds(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.admin.listRefunds(Number(page) || 1, Number(pageSize) || 20);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Audit history of administrative changes' })
  listAudit(@Query() query: AdminAuditQueryDto) {
    return this.admin.listAudit(query);
  }
}
