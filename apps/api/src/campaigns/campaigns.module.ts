import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [NotificationsModule],
  providers: [CampaignsService],
  controllers: [CampaignsController],
})
export class CampaignsModule {}
