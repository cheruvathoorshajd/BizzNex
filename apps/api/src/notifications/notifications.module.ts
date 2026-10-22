import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [NotificationsService],
  controllers: [NotificationsController],
  /** Other modules (campaigns, posts, deals) notify through NotificationsService.notify. */
  exports: [NotificationsService],
})
export class NotificationsModule {}
