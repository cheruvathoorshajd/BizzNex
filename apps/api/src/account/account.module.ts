import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { jwtOptions } from '../common/jwt-config';
import { AccountService } from './account.service';
import { AccountController } from './account.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: jwtOptions,
    }),
  ],
  providers: [AccountService],
  controllers: [AccountController],
})
export class AccountModule {}
