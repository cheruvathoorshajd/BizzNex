import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [NotificationsModule],
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
