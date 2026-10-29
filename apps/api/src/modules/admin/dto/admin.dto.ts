import { ApiProperty, ApiPropertyOptional , PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { AMENITY_CODES, BOOKING_STATUS, type BookingStatus } from '@voyago/shared';
import { IsoDateConstraint } from '../../availability/dto/search.dto';

export class AdminBookingQueryDto {
  @ApiPropertyOptional({ enum: Object.values(BOOKING_STATUS) })
  @IsOptional()
  @IsIn(Object.values(BOOKING_STATUS))
  status?: BookingStatus;

  @ApiPropertyOptional({ description: 'Booking reference, guest email or hotel name.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hotelId?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class UpsertHotelDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  destinationId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  starRating: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  addressLine: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  locality: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  shortDescription: string;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  description: string;

  @ApiPropertyOptional({ type: [String], enum: AMENITY_CODES })
  @IsOptional()
  @IsArray()
  @IsIn(AMENITY_CODES, { each: true })
  amenities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRoomDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  totalRooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRatePlanDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Discount in basis points (1000 = 10%).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(5000)
  discountBasisPoints?: number;

  @ApiPropertyOptional({ description: 'Meal/flexibility premium in basis points.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  supplementBasisPoints?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateInventoryDto {
  @ApiProperty({ example: '2026-12-10' })
  @Validate(IsoDateConstraint)
  fromDate: string;

  @ApiProperty({ example: '2026-12-20' })
  @Validate(IsoDateConstraint)
  toDate: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  roomsOpen?: number;

  @ApiPropertyOptional({ description: 'Nightly tariff in minor units (paise).' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseRateMinor?: number;
}

export class AdminAuditQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 25;
}

/**
 * PATCH body for a hotel. PartialType keeps every validator from
 * UpsertHotelDto while making the fields optional - a bare TypeScript
 * Partial<> is erased at runtime and validates nothing.
 */
export class UpdateHotelDto extends PartialType(UpsertHotelDto) {}
