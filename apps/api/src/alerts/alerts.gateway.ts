import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  jti?: string;
  type: string;
  iat?: number;
  exp?: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/notifications',
})
export class AlertsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AlertsGateway.name);
  private readonly jwtSecret: string;

  // Track user -> socket IDs mapping
  private userSockets: Map<string, Set<string>> = new Map();
  // Track socket ID -> user ID mapping for cleanup
  private socketUsers: Map<string, string> = new Map();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || '';
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token && typeof auth.token === 'string') {
      return auth.token;
    }

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Notification client attempting connection: ${client.id}`);

    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: no token provided`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.jwtSecret,
        algorithms: ['HS256'],
      });

      const userId = payload.sub;

      // Track socket for this user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      this.socketUsers.set(client.id, userId);

      // Join user-specific room
      void client.join(`user:${userId}`);

      this.logger.log(
        `Client ${client.id} connected to notifications for user ${userId}`,
      );

      client.emit('connected', {
        clientId: client.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} rejected: invalid token - ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Invalid authentication token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Notification client disconnected: ${client.id}`);

    const userId = this.socketUsers.get(client.id);
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(client.id);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { event: string; data: number } {
    return { event: 'pong', data: Date.now() };
  }

  /**
   * Send a notification to a specific user
   */
  sendToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`Sent ${event} to user ${userId}`);
  }

  /**
   * Broadcast to all connected users
   */
  broadcast(event: string, data: unknown): void {
    this.server.emit(event, data);
  }

  /**
   * Get stats about notification connections
   */
  getStats(): { connectedUsers: number; connectedSockets: number } {
    return {
      connectedUsers: this.userSockets.size,
      connectedSockets: this.socketUsers.size,
    };
  }

  /**
   * Check if a user is connected
   */
  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }
}
