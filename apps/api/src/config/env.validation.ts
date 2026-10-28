import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/**
 * Fail-fast environment contract. The app refuses to boot with missing or
 * weak configuration rather than falling back to insecure defaults.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT = 4000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  /**
   * Direct (non-pooled) PostgreSQL connection used only by Prisma Migrate.
   * Set it to the same value as DATABASE_URL when there is no pooler.
   */
  @IsString()
  @IsNotEmpty()
  DIRECT_URL: string;

  @IsString()
  @IsNotEmpty()
  MONGODB_URI: string;

  @IsString()
  @MinLength(24, { message: 'JWT_ACCESS_SECRET must be at least 24 characters' })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(24, { message: 'JWT_REFRESH_SECRET must be at least 24 characters' })
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_ACCESS_TTL = '900s';

  @IsString()
  JWT_REFRESH_TTL = '7d';

  @IsString()
  CORS_ORIGINS = 'http://localhost:3000';

  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS = 60;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 300;

  /** Per-minute budget for login and registration. Keep this low in production. */
  @IsInt()
  @Min(1)
  AUTH_THROTTLE_LIMIT = 10;

  @IsString()
  LOG_LEVEL = 'info';

  @IsOptional()
  @IsString()
  SEED_DEMO_CUSTOMER_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SEED_DEMO_ADMIN_PASSWORD?: string;
}

export function validateEnv(raw: Record<string, unknown>): EnvironmentVariables {
  const numericKeys = ['API_PORT', 'THROTTLE_TTL_SECONDS', 'THROTTLE_LIMIT', 'AUTH_THROTTLE_LIMIT'];
  const coerced: Record<string, unknown> = { ...raw };
  for (const key of numericKeys) {
    if (coerced[key] !== undefined && coerced[key] !== '') {
      coerced[key] = Number(coerced[key]);
    } else {
      delete coerced[key];
    }
  }
  for (const key of Object.keys(coerced)) {
    if (coerced[key] === '') delete coerced[key];
  }

  const config = plainToInstance(EnvironmentVariables, coerced, {
    enableImplicitConversion: false,
    exposeDefaultValues: true,
  });

  const errors = validateSync(config, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${detail}`);
  }

  if (
    config.NODE_ENV === NodeEnv.Production &&
    config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET
  ) {
    throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ in production');
  }

  return config;
}
