import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AccessTokenPayload {
  sub: string;
  jti: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  family: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

interface DeviceInfo {
  userAgent?: string;
  ip?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    cashBalance: number;
    onboardingCompleted: boolean;
    onboardingStep: number;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL = '15m';
  private readonly REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private tokenBlacklistService: TokenBlacklistService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async register(
    registerDto: RegisterDto,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthResponse> {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password (increased to 12 rounds per OWASP)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
    });

    await this.userRepository.save(user);

    // Generate token pair
    const tokens = await this.generateTokenPair(user, deviceInfo);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        cashBalance: user.cashBalance,
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
        role: user.role,
      },
    };
  }

  async login(
    loginDto: LoginDto,
    deviceInfo?: DeviceInfo,
  ): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is disabled
    if (user.disabled) {
      throw new ForbiddenException('Account is disabled');
    }

    // Generate token pair
    const tokens = await this.generateTokenPair(user, deviceInfo);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        cashBalance: user.cashBalance,
        onboardingCompleted: user.onboardingCompleted,
        onboardingStep: user.onboardingStep,
        role: user.role,
      },
    };
  }

  /**
   * Refresh tokens using a valid refresh token
   * Implements token rotation for security
   */
  async refreshTokens(
    refreshToken: string,
    deviceInfo?: DeviceInfo,
  ): Promise<TokenPair> {
    // Verify the refresh token
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Hash the token to look it up
    const tokenHash = this.hashToken(refreshToken);

    // Find the stored refresh token
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!storedToken) {
      // Token not found - possible token reuse attack
      // Revoke entire family as a precaution
      await this.revokeTokenFamily(
        payload.family,
        'Token not found - possible reuse',
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revoked) {
      // Token was already revoked - definite token reuse attack
      await this.revokeTokenFamily(payload.family, 'Token reuse detected');
      throw new UnauthorizedException('Token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (storedToken.user.disabled) {
      await this.revokeTokenFamily(payload.family, 'User disabled');
      throw new ForbiddenException('Account is disabled');
    }

    // Revoke the current token (rotation)
    storedToken.revoked = true;
    storedToken.revokedAt = new Date();
    storedToken.revokedReason = 'Rotated';
    await this.refreshTokenRepository.save(storedToken);

    // Generate new token pair with same family
    return this.generateTokenPair(storedToken.user, deviceInfo, payload.family);
  }

  /**
   * Logout - blacklist the access token and revoke refresh tokens
   */
  async logout(
    userId: string,
    accessTokenJti?: string,
    accessTokenExp?: number,
  ): Promise<void> {
    // Blacklist the access token if provided
    if (accessTokenJti && accessTokenExp) {
      await this.tokenBlacklistService.blacklist(
        accessTokenJti,
        new Date(accessTokenExp * 1000),
      );
    }

    // Revoke all user tokens for complete logout
    await this.tokenBlacklistService.revokeAllUserTokens(userId);

    // Clear user cache
    const cacheKey = `user:${userId}`;
    await this.cacheManager.del(cacheKey);
  }

  /**
   * Generate a pair of access and refresh tokens
   */
  private async generateTokenPair(
    user: User,
    deviceInfo?: DeviceInfo,
    existingFamily?: string,
  ): Promise<TokenPair> {
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();
    const family = existingFamily || crypto.randomUUID();

    // Generate access token (short-lived)
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      jti: accessJti,
      type: 'access',
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.ACCESS_TOKEN_TTL,
      algorithm: 'HS256',
    });

    // Generate refresh token (long-lived)
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: refreshJti,
      family,
      type: 'refresh',
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
      algorithm: 'HS256',
    });

    // Store refresh token in database
    const tokenHash = this.hashToken(refreshToken);
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash,
      family,
      expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL_MS),
      deviceInfo: deviceInfo || null,
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  /**
   * Revoke all tokens in a family (used for security when token reuse is detected)
   */
  private async revokeTokenFamily(
    family: string,
    reason: string,
  ): Promise<void> {
    await this.refreshTokenRepository.update(
      { family, revoked: false },
      { revoked: true, revokedAt: new Date(), revokedReason: reason },
    );
  }

  /**
   * Hash a token for secure storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
