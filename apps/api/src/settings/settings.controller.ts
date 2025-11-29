import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SettingsService } from './settings.service';
import { UpdateTradingPreferencesDto } from './dto/update-trading-preferences.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@CurrentUser() user: User) {
    return this.settingsService.getSettings(user.id);
  }

  @Put('preferences')
  async updateTradingPreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateTradingPreferencesDto,
  ) {
    return this.settingsService.updateTradingPreferences(user.id, dto);
  }

  @Put('theme')
  async updateTheme(@CurrentUser() user: User, @Body() dto: UpdateThemeDto) {
    return this.settingsService.updateTheme(user.id, dto);
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.settingsService.changePassword(user.id, dto);
  }
}
