// Loaded before anything else so configuration read at module-evaluation time
// (such as the credential rate limit on AuthController) sees .env values.
import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const port = config.get<number>('API_PORT', 4000);
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

  app.enableShutdownHooks();

  if (!isProduction) {
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

  await app.listen(port, '0.0.0.0');
  logger.log(`Voyago API listening on http://localhost:${port}/api/v1`);
  if (!isProduction) logger.log(`Swagger UI on http://localhost:${port}/api/docs`);
}

void bootstrap();
