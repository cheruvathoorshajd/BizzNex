import { Body, Controller, Delete, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { updateOnboardingSchema } from '@bizznex/shared';
import type { UpdateOnboardingInput } from '@bizznex/shared';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  /** Merge progress into the user's onboarding state; returns the updated user. */
  @Patch()
  update(@CurrentUser() userId: string, @Body(new ZodValidationPipe(updateOnboardingSchema)) body: UpdateOnboardingInput) {
    return this.onboarding.update(userId, body);
  }

  /** Fill the workspace with a realistic sample business (idempotent). */
  @Post('sample')
  seed(@CurrentUser() userId: string) {
    return this.onboarding.seedSample(userId);
  }

  /** Remove every record the sample created, leaving the user's own data untouched. */
  @Delete('sample')
  clear(@CurrentUser() userId: string) {
    return this.onboarding.clearSample(userId);
  }
}
