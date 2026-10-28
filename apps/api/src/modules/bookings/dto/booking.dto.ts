import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BOOKING_STATUS, SEARCH_LIMITS, type BookingStatus } from '@voyago/shared';

export class GuestDto {
  @ApiProperty({ example: 'Aarav' })
  @IsString()
  @IsNotEmpty({ message: 'Guest first name is required.' })
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  firstName: string;

  @ApiProperty({ example: 'Sharma' })
  @IsString()
  @IsNotEmpty({ message: 'Guest last name is required.' })
  @MaxLength(60)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  lastName: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isLeadGuest = false;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Quote issued by POST /quotes. Prices come from here only.' })
  @IsString()
  @IsNotEmpty()
  quoteId: string;

  @ApiProperty({ example: 'traveller@example.com' })
  @IsEmail({}, { message: 'Enter a valid email address for the booking confirmation.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @MaxLength(255)
  contactEmail: string;

  @ApiProperty({ example: '+91 98200 12345' })
  @IsString()
  @Matches(/^\+?[0-9][0-9\s-]{7,16}$/, { message: 'Enter a valid contact phone number.' })
  contactPhone: string;

  @ApiProperty({ type: [GuestDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least the lead guest is required.' })
  @ArrayMaxSize(SEARCH_LIMITS.MAX_ROOMS * SEARCH_LIMITS.MAX_ADULTS_PER_ROOM)
  @ValidateNested({ each: true })
  @Type(() => GuestDto)
  guests: GuestDto[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Special requests are limited to 500 characters.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  specialRequests?: string;

  @ApiProperty({ description: 'The customer must acknowledge the cancellation policy.' })
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  acceptedCancellationPolicy: boolean;
}

export class CancelBookingDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reason?: string;
}

export class BookingListQueryDto {
  @ApiPropertyOptional({ enum: Object.values(BOOKING_STATUS) })
  @IsOptional()
  @IsIn(Object.values(BOOKING_STATUS))
  status?: BookingStatus;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  pageSize = 10;
}
