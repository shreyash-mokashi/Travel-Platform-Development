import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { PAYMENT_SCENARIO, type PaymentScenario } from '@voyago/shared';

export class SimulatePaymentDto {
  @ApiProperty({
    enum: Object.values(PAYMENT_SCENARIO),
    description:
      'Which demo outcome to simulate. No card details are collected and no real ' +
      'payment gateway is contacted.',
  })
  @IsIn(Object.values(PAYMENT_SCENARIO), {
    message: 'Choose one of the supported demo payment outcomes.',
  })
  scenario: PaymentScenario;

  @ApiProperty({
    description: 'Client-generated key. Replaying the same key returns the original result.',
  })
  @IsString()
  @IsNotEmpty({ message: 'An idempotency key is required.' })
  @Length(8, 100)
  idempotencyKey: string;
}

export class ResolvePendingPaymentDto {
  @ApiProperty({ enum: ['SUCCESS', 'FAILURE'] })
  @IsIn(['SUCCESS', 'FAILURE'])
  outcome: 'SUCCESS' | 'FAILURE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
