import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserPreferences } from './entities/user-preferences.entity';
import { UserLayout } from './entities/user-layout.entity';
import { UserLayoutService } from './user-layout.service';
import { UserLayoutController } from './user-layout.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPreferences, UserLayout])],
  controllers: [UsersController, UserLayoutController],
  providers: [UsersService, UserLayoutService],
  exports: [UsersService, UserLayoutService, TypeOrmModule],
})
export class UsersModule {}
