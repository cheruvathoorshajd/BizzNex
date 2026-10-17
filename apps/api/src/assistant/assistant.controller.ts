import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { assistantAskSchema } from '@bizznex/shared';
import type { AssistantAskInput } from '@bizznex/shared';
import { AssistantService } from './assistant.service';

@ApiTags('assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('ask')
  ask(@CurrentUser() userId: string, @Body(new ZodValidationPipe(assistantAskSchema)) body: AssistantAskInput) {
    return this.assistant.ask(userId, body);
  }
}
