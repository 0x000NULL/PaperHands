import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { TradierStreamService } from '../services/tradier-stream.service';
import { SubscriptionService } from '../services/subscription.service';
import type { NormalizedStreamEvent } from '../interfaces/streaming.interfaces';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

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

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly tradierStreamService: TradierStreamService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);

    // Send connection acknowledgment
    client.emit('connected', {
      clientId: client.id,
      timestamp: new Date().toISOString(),
    });
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
  ): Promise<{ success: boolean; symbols: string[] }> {
    const { symbols } = payload;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return { success: false, symbols: [] };
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
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: UnsubscribePayload,
  ): { success: boolean; symbols: string[] } {
    const { symbols } = payload;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return { success: false, symbols: [] };
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
