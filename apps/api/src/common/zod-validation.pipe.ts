import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/** Validates a request payload against a shared Zod schema. */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: parsed.error.flatten(),
      });
    }
    return parsed.data;
  }
}
