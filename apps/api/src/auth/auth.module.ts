import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined');
        }
        // Use config value or default to 7 days
        // Supports both string ('7d', '1h') and number (seconds) formats
        const expiresInConfig = configService.get<string>(
          'JWT_EXPIRES_IN',
          '7d',
        );
        const expiresIn: string | number = /^\d+$/.test(expiresInConfig)
          ? parseInt(expiresInConfig, 10)
          : expiresInConfig;
        return {
          secret,
          // The JWT library accepts both string ('7d') and number (seconds)
          // Type assertion needed due to strict StringValue type in @nestjs/jwt
          signOptions: { expiresIn: expiresIn as unknown as number },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}
