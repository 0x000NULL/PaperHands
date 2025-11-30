import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import {
  AuthService,
  AccessTokenPayload,
  AuthResponse,
  TokenPair,
} from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';

interface UserWithToken extends User {
  token?: AccessTokenPayload;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  private getDeviceInfo(request: Request) {
    const forwarded = request.headers['x-forwarded-for'];
    const ip =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : (request.ip ?? undefined);

    return {
      userAgent: request.headers['user-agent'],
      ip,
    };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  async register(
    @Body() registerDto: RegisterDto,
    @Req() request: Request,
  ): Promise<AuthResponse> {
    return this.authService.register(registerDto, this.getDeviceInfo(request));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
  ): Promise<AuthResponse> {
    return this.authService.login(loginDto, this.getDeviceInfo(request));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 per minute
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<TokenPair> {
    return this.authService.refreshTokens(
      refreshDto.refreshToken,
      this.getDeviceInfo(request),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: UserWithToken,
    @Headers('authorization') authHeader?: string,
  ) {
    // Extract token info for blacklisting
    let jti: string | undefined;
    let exp: number | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = this.jwtService.decode<AccessTokenPayload>(token);
        if (decoded) {
          jti = decoded.jti;
          exp = decoded.exp;
        }
      } catch {
        // Ignore decode errors
      }
    }

    await this.authService.logout(user.id, jti, exp);
    return { message: 'Logged out successfully' };
  }
}
