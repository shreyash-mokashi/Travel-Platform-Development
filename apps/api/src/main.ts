// Loaded before anything else so configuration read at module-evaluation time
// (such as the credential rate limit on AuthController) sees .env values.
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, mountSwagger } from './configure-app';

/** Long-running server entry point, used locally and on any PaaS host. */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  const { isProduction } = configureApp(app);

  // Most PaaS hosts inject PORT and expect the process to bind to it.
  // API_PORT stays as the local default.
  const port = Number(process.env.PORT) || app.get(ConfigService).get<number>('API_PORT', 4000);

  if (!isProduction) mountSwagger(app, port);

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`Voyago API listening on port ${port} at /api/v1`);
  if (!isProduction) logger.log(`Swagger UI on http://localhost:${port}/api/docs`);
}

void bootstrap();
