import { Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const run = (error: unknown) => {
    const json = jest.fn();
    const res = { status: jest.fn().mockReturnValue({ json }) };
    const host: any = { switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ url: '/x' }) }) };
    new AllExceptionsFilter().catch(error, host);
    return { status: res.status.mock.calls[0][0], body: json.mock.calls[0][0] };
  };
  const prismaError = (code: string) => new Prisma.PrismaClientKnownRequestError('db', { code, clientVersion: 'test' });

  it('keeps HTTP exceptions as they are', () => {
    expect(run(new NotFoundException('Deal not found'))).toMatchObject({ status: 404, body: { message: 'Deal not found', path: '/x' } });
  });

  it.each([['P2002', 409], ['P2003', 400], ['P2025', 404]])('maps Prisma %s to %i instead of a 500', (code, status) => {
    expect(run(prismaError(code)).status).toBe(status);
  });

  it('passes through 4xx errors from the body parser', () => {
    expect(run(Object.assign(new Error('request entity too large'), { status: 413 })).status).toBe(413);
  });

  it('hides the details of anything unexpected', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { status, body } = run(new Error('secret stack detail'));
    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
  });
});
