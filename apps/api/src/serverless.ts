import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

/**
 * Serverless entry point.
 *
 * The Express instance is cached on the module, so a warm invocation reuses
 * the already-bootstrapped Nest application and its database connections
 * instead of paying the start-up cost again. Concurrent cold invocations share
 * one in-flight promise rather than bootstrapping twice.
 */
let cached: Express | undefined;
let bootstrapping: Promise<Express> | undefined;

async function bootstrap(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    bufferLogs: false,
  });

  configureApp(app);

  // init(), not listen(): the platform owns the socket.
  await app.init();
  return expressApp;
}

export async function getApp(): Promise<Express> {
  if (cached) return cached;
  bootstrapping ??= bootstrap().then((app) => {
    cached = app;
    return app;
  });
  return bootstrapping;
}

/** Request handler in the shape the Vercel Node runtime expects. */
export default async function handler(
  req: Parameters<Express>[0],
  res: Parameters<Express>[1],
): Promise<void> {
  const app = await getApp();
  app(req, res);
}
