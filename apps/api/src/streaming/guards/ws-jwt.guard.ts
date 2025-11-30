import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  jti?: string;
  type: string;
  iat: number;
  exp: number;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || '';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Missing authentication token');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtSecret,
        algorithms: ['HS256'],
      });

      // Attach user info to socket for later use
      (client as Socket & { user?: JwtPayload }).user = payload;

      return true;
    } catch (error) {
      this.logger.warn(
        `WebSocket auth failed for client ${client.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new WsException('Invalid authentication token');
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from handshake auth (preferred method)
    const auth = client.handshake.auth as { token?: unknown } | undefined;
    if (auth?.token && typeof auth.token === 'string') {
      return auth.token;
    }

    // REMOVED: Query parameter token support (security risk - tokens logged in access logs)

    // Try to get token from Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }
}
