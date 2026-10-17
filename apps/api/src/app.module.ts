import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { NotesModule } from './notes/notes.module';
import { HealthModule } from './health/health.module';
import { CompaniesModule } from './companies/companies.module';
import { ContactsModule } from './contacts/contacts.module';
import { DealsModule } from './deals/deals.module';
import { ActivitiesModule } from './activities/activities.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { PostsModule } from './posts/posts.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AssistantModule } from './assistant/assistant.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AccountModule } from './account/account.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // a generous ceiling for everything; sign-in and password routes set tighter limits
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    NotesModule,
    HealthModule,
    CompaniesModule,
    ContactsModule,
    DealsModule,
    ActivitiesModule,
    CampaignsModule,
    PostsModule,
    EventsModule,
    NotificationsModule,
    AssistantModule,
    OnboardingModule,
    AccountModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
