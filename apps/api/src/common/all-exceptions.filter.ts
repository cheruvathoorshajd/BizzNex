import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/** Database errors a client can cause, mapped to the status they deserve instead of a 500. */
const PRISMA_STATUS: Record<string, [number, string]> = {
  P2002: [HttpStatus.CONFLICT, 'That record already exists.'],
  P2003: [HttpStatus.BAD_REQUEST, 'A linked record does not exist.'],
  P2025: [HttpStatus.NOT_FOUND, 'Record not found.'],
};

function resolve(exception: unknown): { status: number; body: string | object } {
  if (exception instanceof HttpException) return { status: exception.getStatus(), body: exception.getResponse() };
  if (exception instanceof Prisma.PrismaClientKnownRequestError && PRISMA_STATUS[exception.code]) {
    const [status, message] = PRISMA_STATUS[exception.code];
    return { status, body: { message } };
  }
  // body-parser and friends throw plain errors carrying a 4xx status (bad JSON, payload too large)
  const status = (exception as { status?: unknown })?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return { status, body: { message: (exception as Error).message } };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, body: { message: 'Internal server error' } };
}

/** Consistent error envelope for every thrown error. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const { status, body } = resolve(exception);

    if (status >= 500) this.logger.error(exception);

    res.status(status).json({
      statusCode: status,
      path: req.url,
      timestamp: new Date().toISOString(),
      ...(typeof body === 'string' ? { message: body } : body),
    });
  }
}
