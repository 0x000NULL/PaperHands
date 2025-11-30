import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { TradierStreamService } from '../services/tradier-stream.service';
import { SubscriptionService } from '../services/subscription.service';
import type { NormalizedStreamEvent } from '../interfaces/streaming.interfaces';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

interface JwtPayload {
  sub: string;
  jti?: string;
  type: string;
  iat?: number;
  exp?: number;
}

interface SubscribePayload {
  symbols: string[];
}

interface UnsubscribePayload {
  symbols: string[];
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/streaming',
})
export class StreamingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(StreamingGateway.name);
  private readonly jwtSecret: string;

  // Rate limiting: track message counts per client
  private readonly RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
  private readonly RATE_LIMIT_MAX_MESSAGES = 30; // 30 messages per window

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly tradierStreamService: TradierStreamService,
    private readonly subscriptionService: SubscriptionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET') || '';
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(client: Socket): string | null {
    // Try handshake auth object (preferred)
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token && typeof auth.token === 'string') {
      return auth.token;
    }

    // Try Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  /**
   * Check rate limit for a client
   * Returns true if request is allowed, false if rate limited
   */
  private async checkRateLimit(clientId: string): Promise<boolean> {
    const key = `ws-rate:${clientId}`;
    const count = (await this.cacheManager.get<number>(key)) || 0;

    if (count >= this.RATE_LIMIT_MAX_MESSAGES) {
      return false;
    }

    await this.cacheManager.set(key, count + 1, this.RATE_LIMIT_WINDOW_MS);
    return true;
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client attempting connection: ${client.id}`);

    // Authenticate on connection
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

      // Attach user info to socket for later use
      (client as Socket & { user?: unknown }).user = payload;

      this.logger.log(
        `Client ${client.id} authenticated for user ${payload.sub}`,
      );

      // Send connection acknowledgment
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
    this.logger.log(`Client disconnected: ${client.id}`);

    // Get symbols this client was subscribed to
    const clientSymbols = this.subscriptionService.getClientSymbols(client.id);

    // Remove client from all subscriptions
    this.subscriptionService.removeClient(client.id);

    // Check if we need to unsubscribe from upstream
    for (const symbol of clientSymbols) {
      if (!this.subscriptionService.hasSubscribers(symbol)) {
        this.tradierStreamService.unsubscribe([symbol]);
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ): Promise<{ success: boolean; symbols: string[]; error?: string }> {
    // Check rate limit
    if (!(await this.checkRateLimit(client.id))) {
      return { success: false, symbols: [], error: 'Rate limit exceeded' };
    }

    const { symbols } = payload;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return { success: false, symbols: [], error: 'No symbols provided' };
    }

    // Limit symbols per request
    if (symbols.length > 50) {
      return {
        success: false,
        symbols: [],
        error: 'Maximum 50 symbols per request',
      };
    }

    const upperSymbols = symbols.map((s) => s.toUpperCase());
    this.logger.debug(
      `Client ${client.id} subscribing to: ${upperSymbols.join(', ')}`,
    );

    // Add client subscriptions
    for (const symbol of upperSymbols) {
      this.subscriptionService.subscribe(client.id, symbol);
      // Join socket.io room for this symbol
      void client.join(`symbol:${symbol}`);
    }

    // Subscribe to upstream Tradier stream
    await this.tradierStreamService.subscribe(upperSymbols);

    return { success: true, symbols: upperSymbols };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UnsubscribePayload,
  ): Promise<{ success: boolean; symbols: string[]; error?: string }> {
    // Check rate limit
    if (!(await this.checkRateLimit(client.id))) {
      return { success: false, symbols: [], error: 'Rate limit exceeded' };
    }

    const { symbols } = payload;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return { success: false, symbols: [], error: 'No symbols provided' };
    }

    const upperSymbols = symbols.map((s) => s.toUpperCase());
    this.logger.debug(
      `Client ${client.id} unsubscribing from: ${upperSymbols.join(', ')}`,
    );

    // Remove client subscriptions
    for (const symbol of upperSymbols) {
      this.subscriptionService.unsubscribe(client.id, symbol);
      // Leave socket.io room for this symbol
      void client.leave(`symbol:${symbol}`);

      // If no more subscribers, unsubscribe from upstream
      if (!this.subscriptionService.hasSubscribers(symbol)) {
        this.tradierStreamService.unsubscribe([symbol]);
      }
    }

    return { success: true, symbols: upperSymbols };
  }

  @SubscribeMessage('ping')
  handlePing(): { event: string; data: number } {
    return { event: 'pong', data: Date.now() };
  }

  /**
   * Handle stream events from TradierStreamService
   */
  @OnEvent('stream.event')
  handleStreamEvent(event: NormalizedStreamEvent): void {
    // Broadcast to all clients subscribed to this symbol
    this.server.to(`symbol:${event.symbol}`).emit(event.type, {
      symbol: event.symbol,
      data: event.data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get current connection statistics
   */
  getStats(): {
    connectedClients: number;
    subscribedSymbols: number;
    subscriptionCount: number;
  } {
    const sockets = this.server?.sockets?.sockets;
    return {
      connectedClients: sockets ? sockets.size : 0,
      subscribedSymbols:
        this.tradierStreamService.getSubscribedSymbols().length,
      subscriptionCount: this.subscriptionService.getTotalSubscriptions(),
    };
  }
}
