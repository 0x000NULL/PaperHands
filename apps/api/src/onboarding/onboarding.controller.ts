import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OnboardingService } from './onboarding.service';
import { CompleteStepDto } from './dto/update-onboarding.dto';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  async getStatus(@CurrentUser() user: User) {
    return this.onboardingService.getStatus(user.id);
  }

  @Post('step/:step')
  @HttpCode(HttpStatus.OK)
  async completeStep(
    @CurrentUser() user: User,
    @Param('step', ParseIntPipe) step: number,
    @Body() dto: CompleteStepDto,
  ) {
    return this.onboardingService.completeStep(user.id, step, dto);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(@CurrentUser() user: User) {
    return this.onboardingService.completeOnboarding(user.id);
  }

  @Post('skip')
  @HttpCode(HttpStatus.OK)
  async skipOnboarding(@CurrentUser() user: User) {
    return this.onboardingService.skipOnboarding(user.id);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetOnboarding(@CurrentUser() user: User) {
    return this.onboardingService.resetOnboarding(user.id);
  }
}
