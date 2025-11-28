import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { User } from '../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
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

    return user;
  }
}
