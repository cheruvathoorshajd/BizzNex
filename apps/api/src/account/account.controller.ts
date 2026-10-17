import { Body, Controller, Delete, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { changePasswordSchema, deleteAccountSchema, updatePreferencesSchema, updateProfileSchema } from '@bizznex/shared';
import type { ChangePasswordInput, DeleteAccountInput, UpdatePreferencesInput, UpdateProfileInput } from '@bizznex/shared';
import { AccountService } from './account.service';

/** The signed-in user's own account: profile, preferences, password, and deletion. */
@ApiTags('account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Patch('profile')
  profile(@CurrentUser() userId: string, @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput) {
    return this.account.updateProfile(userId, body);
  }

  @Patch('preferences')
  preferences(@CurrentUser() userId: string, @Body(new ZodValidationPipe(updatePreferencesSchema)) body: UpdatePreferencesInput) {
    return this.account.updatePreferences(userId, body);
  }

  // both check the current password, so they get the same limit as sign-in
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('password')
  password(@CurrentUser() userId: string, @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput) {
    return this.account.changePassword(userId, body);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Delete()
  remove(@CurrentUser() userId: string, @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountInput) {
    return this.account.deleteAccount(userId, body.password);
  }
}
