import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  AMENITY_CODES,
  HOTEL_SORT_OPTIONS,
  MEAL_PLAN,
  SEARCH_LIMITS,
  isIsoDate,
  nightsBetween,
  todayIso,
  type HotelSortOption,
  type MealPlan,
} from '@voyago/shared';

@ValidatorConstraint({ name: 'isoDate', async: false })
export class IsoDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isIsoDate(value);
  }
  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid date in YYYY-MM-DD format.`;
  }
}

/** Cross-field stay-window rules shared by search and quote requests. */
@ValidatorConstraint({ name: 'stayWindow', async: false })
export class StayWindowConstraint implements ValidatorConstraintInterface {
  private message = 'Invalid stay dates.';

  validate(checkOut: unknown, args: ValidationArguments): boolean {
    const object = args.object as { checkIn?: string };
    const checkIn = object.checkIn;
    if (typeof checkIn !== 'string' || typeof checkOut !== 'string') return true;
    if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return true;

    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) {
      this.message = 'Check-out must be at least one night after check-in.';
      return false;
    }
    if (nights > SEARCH_LIMITS.MAX_NIGHTS) {
      this.message = `Stays are limited to ${SEARCH_LIMITS.MAX_NIGHTS} nights.`;
      return false;
    }
    if (checkIn < todayIso()) {
      this.message = 'Check-in cannot be in the past.';
      return false;
    }
    if (nightsBetween(todayIso(), checkIn) > SEARCH_LIMITS.MAX_ADVANCE_DAYS) {
      this.message = `Bookings open ${SEARCH_LIMITS.MAX_ADVANCE_DAYS} days in advance.`;
      return false;
    }
    return true;
  }

  defaultMessage(): string {
    return this.message;
  }
}

const toArray = (value: unknown): unknown[] =>
  value === undefined || value === null
    ? []
    : Array.isArray(value)
      ? value
      : String(value)
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);

export class StayQueryDto {
  @ApiProperty({ example: '2026-12-10' })
  @Validate(IsoDateConstraint)
  checkIn: string;

  @ApiProperty({ example: '2026-12-13' })
  @Validate(IsoDateConstraint)
  @Validate(StayWindowConstraint)
  checkOut: string;

  @ApiProperty({ minimum: 1, maximum: SEARCH_LIMITS.MAX_ROOMS, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SEARCH_LIMITS.MAX_ROOMS)
  rooms = 1;

  @ApiProperty({ minimum: 1, default: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SEARCH_LIMITS.MAX_ROOMS * SEARCH_LIMITS.MAX_ADULTS_PER_ROOM)
  adults = 2;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(SEARCH_LIMITS.MAX_ROOMS * SEARCH_LIMITS.MAX_CHILDREN_PER_ROOM)
  children = 0;
}

export class HotelSearchQueryDto extends StayQueryDto {
  @ApiProperty({ example: 'goa', description: 'Destination slug, city name or destination id.' })
  @IsString()
  @IsNotEmpty({ message: 'Choose a destination to search.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  destination: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ maximum: SEARCH_LIMITS.MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SEARCH_LIMITS.MAX_PAGE_SIZE)
  pageSize: number = SEARCH_LIMITS.DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ enum: HOTEL_SORT_OPTIONS, default: 'relevance' })
  @IsOptional()
  @IsIn(HOTEL_SORT_OPTIONS)
  sort: HotelSortOption = 'relevance';

  @ApiPropertyOptional({ description: 'Minimum stay total in minor units.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceMinor?: number;

  @ApiPropertyOptional({ description: 'Maximum stay total in minor units.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceMinor?: number;

  @ApiPropertyOptional({ type: [Number], example: [4, 5] })
  @IsOptional()
  @Transform(({ value }) => toArray(value).map((item) => Number(item)))
  @IsArray()
  @ArrayMaxSize(5)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(5, { each: true })
  starRatings?: number[];

  @ApiPropertyOptional({ type: [String], enum: AMENITY_CODES })
  @IsOptional()
  @Transform(({ value }) => toArray(value).map((item) => String(item).toUpperCase()))
  @IsArray()
  @ArrayMaxSize(AMENITY_CODES.length)
  @IsIn(AMENITY_CODES, { each: true })
  amenities?: string[];

  @ApiPropertyOptional({ type: [String], enum: Object.values(MEAL_PLAN) })
  @IsOptional()
  @Transform(({ value }) => toArray(value).map((item) => String(item).toUpperCase()))
  @IsArray()
  @IsIn(Object.values(MEAL_PLAN), { each: true })
  mealPlans?: MealPlan[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  freeCancellation?: boolean;
}

export class HotelOffersQueryDto extends StayQueryDto {}

export class CreateQuoteDto extends StayQueryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  hotelId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ratePlanId: string;

  @ApiPropertyOptional({
    description: 'Total previously shown to the user, used to detect a price change.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedTotalMinor?: number;
}
