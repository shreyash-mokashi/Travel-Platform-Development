import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { FLIGHT_SEARCH_LIMITS, FLIGHT_SORT_OPTIONS, type FlightSortOption } from '@voyago/shared';

export class FlightSearchQueryDto {
  @ApiProperty({ example: 'BOM', description: 'Origin airport IATA code.' })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/)
  from: string;

  @ApiProperty({ example: 'GOI' })
  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Za-z]{3}$/)
  to: string;

  @ApiProperty({ example: '2027-01-15', description: 'Travel date, yyyy-mm-dd.' })
  @IsISO8601({ strict: true })
  date: string;

  @ApiProperty({ minimum: 1, maximum: FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS)
  adults: number = 1;

  @ApiPropertyOptional({ minimum: 0, maximum: 8, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS - 1)
  children: number = 0;

  @ApiPropertyOptional({ enum: FLIGHT_SORT_OPTIONS })
  @IsOptional()
  @IsIn(FLIGHT_SORT_OPTIONS)
  sort?: FlightSortOption;
}

export class CreateFlightQuoteDto {
  @ApiProperty()
  @IsUUID()
  flightId: string;

  @ApiProperty()
  @IsUUID()
  fareClassId: string;

  @ApiProperty({ example: '2027-01-15' })
  @IsISO8601({ strict: true })
  date: string;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS)
  adults: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS - 1)
  children: number = 0;

  @ApiPropertyOptional({
    description: 'Total previously shown to the user, used only to flag a price change.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  expectedTotalMinor?: number;
}

export class FlightPassengerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isLeadPassenger?: boolean;
}

export class CreateFlightBookingDto {
  @ApiProperty({ description: 'Quote issued by POST /flight-quotes. Prices come from here only.' })
  @IsUUID()
  quoteId: string;

  @ApiProperty()
  @IsEmail()
  contactEmail: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  contactPhone: string;

  @ApiProperty({ type: [FlightPassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(FLIGHT_SEARCH_LIMITS.MAX_PASSENGERS)
  @ValidateNested({ each: true })
  @Type(() => FlightPassengerDto)
  passengers: FlightPassengerDto[];

  @ApiProperty({ description: 'The customer must acknowledge the fare rules.' })
  @IsBoolean()
  @IsIn([true], { message: 'The cancellation policy must be accepted.' })
  acceptedCancellationPolicy: boolean;
}

export class CancelFlightBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
