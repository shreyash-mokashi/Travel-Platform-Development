import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

/**
 * Every setting that must hold however the app is hosted. Both entry points -
 * the long-running server in main.ts and the serverless handler in
 * serverless.ts - call this, so the two can never drift apart. Several of
 * these are security controls rather than preferences.
 */
export function configureApp(app: INestApplication): { isProduction: boolean } {
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  const corsOrigins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api/v1');
  // Swagger UI needs relaxed CSP; the API itself serves no other HTML.
  app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
  app.enableCors({ origin: corsOrigins, credentials: true, maxAge: 86_400 });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // Unknown properties are rejected outright, which blocks mass assignment.
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false, value: false },
    }),
  );

  return { isProduction };
}

/** Swagger is development-only and is never mounted in production. */
export function mountSwagger(app: INestApplication, port: number): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Voyago API')
    .setDescription(
      'Voyago hotel booking service. All inventory is seeded demo data and all ' +
        'payments and refunds are simulated - no real money is ever charged.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addServer(`http://localhost:${port}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
