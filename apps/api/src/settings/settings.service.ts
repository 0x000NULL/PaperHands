import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserPreferences } from '../users/entities/user-preferences.entity';
import { UpdateTradingPreferencesDto } from './dto/update-trading-preferences.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SettingsResponse } from './dto/settings-response.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserPreferences)
    private preferencesRepository: Repository<UserPreferences>,
  ) {}

  async getSettings(userId: string): Promise<SettingsResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const preferences = await this.ensurePreferencesExist(userId);

    return {
      account: {
        email: user.email,
        createdAt: user.createdAt,
      },
      trading: {
        defaultOrderType: preferences.defaultOrderType,
        defaultTimeInForce: preferences.defaultTimeInForce,
        defaultCostBasisMethod: preferences.defaultCostBasisMethod,
      },
      display: {
        theme: preferences.theme,
        tourCompleted: preferences.tourCompleted,
      },
    };
  }

  async updateTradingPreferences(
    userId: string,
    dto: UpdateTradingPreferencesDto,
  ): Promise<SettingsResponse> {
    const preferences = await this.ensurePreferencesExist(userId);

    if (dto.defaultOrderType !== undefined) {
      preferences.defaultOrderType = dto.defaultOrderType;
    }
    if (dto.defaultTimeInForce !== undefined) {
      preferences.defaultTimeInForce = dto.defaultTimeInForce;
    }
    if (dto.defaultCostBasisMethod !== undefined) {
      preferences.defaultCostBasisMethod = dto.defaultCostBasisMethod;
    }

    await this.preferencesRepository.save(preferences);

    return this.getSettings(userId);
  }

  async updateTheme(
    userId: string,
    dto: UpdateThemeDto,
  ): Promise<SettingsResponse> {
    const preferences = await this.ensurePreferencesExist(userId);

    preferences.theme = dto.theme;
    await this.preferencesRepository.save(preferences);

    return this.getSettings(userId);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash and save new password (12 rounds per OWASP recommendation)
    const saltRounds = 12;
    user.passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  private async ensurePreferencesExist(
    userId: string,
  ): Promise<UserPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({
        userId,
      });
      await this.preferencesRepository.save(preferences);
    }

    return preferences;
  }
}
