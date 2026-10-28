import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Observable, tap } from 'rxjs';

/** Structured access logging. Request bodies are never logged. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();

    request.id = request.id ?? randomUUID();
    response.setHeader('x-request-id', request.id);

    const startedAt = Date.now();
    const { method, originalUrl } = request;

    return next.handle().pipe(
      tap({
        next: () => this.log(method, originalUrl, response.statusCode, startedAt, request.id),
        error: () => this.log(method, originalUrl, response.statusCode, startedAt, request.id),
      }),
    );
  }

  private log(
    method: string,
    url: string,
    statusCode: number,
    startedAt: number,
    requestId?: string,
  ): void {
    this.logger.log(
      JSON.stringify({
        requestId,
        method,
        path: url.split('?')[0],
        statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  }
}
