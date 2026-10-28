import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

interface NormalisedError {
  status: number;
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Converts every thrown error into the single documented error envelope.
 * Internal messages and stack traces never reach the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalised = this.normalise(exception);

    if (normalised.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${normalised.status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} -> ${normalised.status}: ${normalised.message}`,
      );
    }

    response.status(normalised.status).json({
      statusCode: normalised.status,
      error: normalised.error,
      message: normalised.message,
      ...(normalised.details !== undefined ? { details: normalised.details } : {}),
      requestId: (request as Request & { id?: string }).id,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalise(exception: unknown): NormalisedError {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { status, error: exception.name, message: payload };
      }

      const body = payload as Record<string, unknown>;
      const rawMessage = body.message;
      const isValidationList = Array.isArray(rawMessage);

      return {
        status,
        error: typeof body.error === 'string' ? body.error : exception.name,
        message: isValidationList
          ? 'Request validation failed'
          : typeof rawMessage === 'string'
            ? rawMessage
            : exception.message,
        ...(isValidationList ? { details: rawMessage } : {}),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.normalisePrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'The request could not be processed with the supplied values.',
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  private normalisePrisma(exception: Prisma.PrismaClientKnownRequestError): NormalisedError {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'A record with these details already exists.',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'The requested record was not found.',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'A referenced record does not exist.',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: 'A database error occurred.',
        };
    }
  }
}
