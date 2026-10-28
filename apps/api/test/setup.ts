import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { addDays, todayIso } from '@voyago/shared';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AppModule } from '../src/app.module';

/** Boots the real application against the local Postgres and Mongo stack. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );

  await app.init();
  return app;
}

export const API = '/api/v1';

/** A stay far enough ahead that free-cancellation windows are still open. */
export function futureStay(offsetDays = 45, nights = 2) {
  const checkIn = addDays(todayIso(), offsetDays);
  return { checkIn, checkOut: addDays(checkIn, nights) };
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10_000)}@voyago.test`;
}

export const VALID_PASSWORD = 'TestPassw0rd!2026';
