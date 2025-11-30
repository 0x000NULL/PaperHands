import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User } from '../users/entities/user.entity';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { AccessTokenPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AccessTokenPayload): Promise<User> {
    // Validate token type
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if token is blacklisted
    if (
      payload.jti &&
      (await this.tokenBlacklistService.isBlacklisted(payload.jti))
    ) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Check if all user tokens were revoked
    const revocationTime =
      await this.tokenBlacklistService.getUserRevocationTime(payload.sub);
    if (revocationTime && payload.iat && payload.iat * 1000 < revocationTime) {
      throw new UnauthorizedException('All sessions have been revoked');
    }

    const cacheKey = `user:${payload.sub}`;

    // Check cache first to avoid N+1 DB queries
    let user: User | undefined = await this.cacheManager.get<User>(cacheKey);

    if (!user) {
      const dbUser = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (dbUser) {
        user = dbUser;
        // Cache user for 1 minute
        await this.cacheManager.set(cacheKey, user, 60000);
      }
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    // Check if user account is disabled
    if (user.disabled) {
      throw new UnauthorizedException('Account is disabled');
    }

    return user;
  }
}
