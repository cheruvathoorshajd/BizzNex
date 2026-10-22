import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { updateNotificationSchema } from '@bizznex/shared';
import type { UpdateNotificationInput } from '@bizznex/shared';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() userId: string) {
    return this.notifications.list(userId);
  }

  /* No POST: notifications are created on the server, by the service that made the change
     (NotificationsService.notify), so clients can't forge them. */

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateNotificationSchema)) body: UpdateNotificationInput,
  ) {
    return this.notifications.update(userId, id, body);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.notifications.remove(userId, id);
  }
}
