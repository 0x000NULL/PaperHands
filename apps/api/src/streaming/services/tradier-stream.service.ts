import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import WebSocket from 'ws';
import {
  TradierStreamEvent,
  TradierSessionResponse,
  NormalizedStreamEvent,
  StreamingQuote,
  StreamingTrade,
  StreamingTimesale,
} from '../interfaces/streaming.interfaces';

@Injectable()
export class TradierStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TradierStreamService.name);

  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private subscribedSymbols = new Set<string>();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly baseReconnectDelay = 1000;
  private sessionRefreshInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isShuttingDown = false;

  private readonly tradierApiToken: string;
  private readonly tradierBaseUrl: string;
  private readonly tradierStreamUrl: string;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.tradierApiToken =
      this.configService.get<string>('TRADIER_API_TOKEN') || '';
    this.tradierBaseUrl =
      this.configService.get<string>('TRADIER_BASE_URL') ||
      'https://api.tradier.com';
    this.tradierStreamUrl =
      this.configService.get<string>('TRADIER_STREAM_URL') ||
      'wss://ws.tradier.com/v1/markets/events';
  }

  onModuleInit(): void {
    if (!this.tradierApiToken) {
      this.logger.warn('TRADIER_API_TOKEN not configured - streaming disabled');
      return;
    }

    // Start session refresh timer (refresh every 4 minutes, before 5-min expiry)
    this.sessionRefreshInterval = setInterval(
      () => {
        void this.refreshSession();
      },
      4 * 60 * 1000,
    );

    // Don't connect on startup - wait for first subscription
    this.logger.log('TradierStreamService initialized (lazy connection)');
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;

    if (this.sessionRefreshInterval) {
      clearInterval(this.sessionRefreshInterval);
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.disconnect();
  }

  /**
   * Subscribe to symbols
   */
  async subscribe(symbols: string[]): Promise<void> {
    // Don't attempt to connect if no API token is configured
    if (!this.tradierApiToken) {
      this.logger.debug('Tradier streaming disabled - no API token configured');
      return;
    }

    const upperSymbols = symbols.map((s) => s.toUpperCase());
    let hasNewSymbols = false;

    for (const symbol of upperSymbols) {
      if (!this.subscribedSymbols.has(symbol)) {
        this.subscribedSymbols.add(symbol);
        hasNewSymbols = true;
      }
    }

    if (!hasNewSymbols) {
      return;
    }

    // Connect if not already connected
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    } else {
      // Update subscription
      this.sendSubscription();
    }
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribe(symbols: string[]): void {
    const upperSymbols = symbols.map((s) => s.toUpperCase());
    let hasRemovals = false;

    for (const symbol of upperSymbols) {
      if (this.subscribedSymbols.has(symbol)) {
        this.subscribedSymbols.delete(symbol);
        hasRemovals = true;
      }
    }

    if (!hasRemovals) {
      return;
    }

    if (this.subscribedSymbols.size === 0) {
      // No more symbols - disconnect
      this.disconnect();
    } else if (this.ws?.readyState === WebSocket.OPEN) {
      // Update subscription
      this.sendSubscription();
    }
  }

  /**
   * Get currently subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscribedSymbols);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Create a streaming session with Tradier
   */
  private async createSession(): Promise<string> {
    const response = await fetch(
      `${this.tradierBaseUrl}/v1/markets/events/session`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.tradierApiToken}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      // Check for auth errors (401/403) - don't retry these
      if (response.status === 401 || response.status === 403) {
        this.reconnectAttempts = this.maxReconnectAttempts; // Stop retrying
        throw new Error(`Authentication failed: ${response.status} - check TRADIER_API_TOKEN`);
      }
      throw new Error(`Failed to create session: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      this.reconnectAttempts = this.maxReconnectAttempts; // Stop retrying
      throw new Error('Invalid response from Tradier - not JSON (check API token)');
    }

    const data = (await response.json()) as TradierSessionResponse;
    return data.stream.sessionid;
  }

  /**
   * Connect to Tradier WebSocket
   */
  private async connect(): Promise<void> {
    if (this.isConnecting || this.isShuttingDown) {
      return;
    }

    if (!this.tradierApiToken) {
      this.logger.warn('Cannot connect - TRADIER_API_TOKEN not configured');
      return;
    }

    this.isConnecting = true;

    try {
      // Create new session
      this.sessionId = await this.createSession();
      this.logger.log('Created Tradier streaming session');

      // Connect to WebSocket
      this.ws = new WebSocket(this.tradierStreamUrl);

      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data: WebSocket.Data) => this.onMessage(data));
      this.ws.on('close', (code: number, reason: Buffer) =>
        this.onClose(code, reason.toString()),
      );
      this.ws.on('error', (error: Error) => this.onError(error));
    } catch (error) {
      this.logger.error(
        `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from Tradier WebSocket
   */
  private disconnect(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.sessionId = null;
  }

  /**
   * WebSocket open handler
   */
  private onOpen(): void {
    this.logger.log('Connected to Tradier streaming');
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    if (this.subscribedSymbols.size > 0) {
      this.sendSubscription();
    }
  }

  /**
   * Send subscription to Tradier
   */
  private sendSubscription(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.sessionId) {
      return;
    }

    const payload = {
      symbols: Array.from(this.subscribedSymbols),
      sessionid: this.sessionId,
      filter: ['quote', 'trade', 'timesale'],
      linebreak: true,
    };

    this.ws.send(JSON.stringify(payload));
    this.logger.debug(
      `Subscribed to ${this.subscribedSymbols.size} symbols: ${Array.from(this.subscribedSymbols).join(', ')}`,
    );
  }

  /**
   * WebSocket message handler
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      // Handle different data types from WebSocket
      let message: string;
      if (Buffer.isBuffer(data)) {
        message = data.toString('utf-8').trim();
      } else if (data instanceof ArrayBuffer) {
        message = Buffer.from(data).toString('utf-8').trim();
      } else if (Array.isArray(data)) {
        message = Buffer.concat(data).toString('utf-8').trim();
      } else {
        message = String(data).trim();
      }
      if (!message) return;

      // Tradier sends newline-delimited JSON when linebreak=true
      const lines = message.split('\n').filter((line) => line.trim());

      for (const line of lines) {
        try {
          const event = JSON.parse(line) as TradierStreamEvent;
          this.processEvent(event);
        } catch {
          // Skip invalid JSON lines
        }
      }
    } catch (error) {
      this.logger.error(
        `Error processing message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Process and normalize a Tradier event
   */
  private processEvent(event: TradierStreamEvent): void {
    const normalized = this.normalizeEvent(event);
    if (normalized) {
      // Emit event for other services to consume
      this.eventEmitter.emit('stream.event', normalized);
      this.eventEmitter.emit(`stream.${normalized.type}`, normalized);
      this.eventEmitter.emit(
        `stream.${normalized.type}.${normalized.symbol}`,
        normalized,
      );
    }
  }

  /**
   * Normalize Tradier event to common format
   */
  private normalizeEvent(
    event: TradierStreamEvent,
  ): NormalizedStreamEvent | null {
    switch (event.type) {
      case 'quote': {
        const quote: StreamingQuote = {
          symbol: event.symbol,
          bid: event.bid,
          bidSize: event.bidsz,
          ask: event.ask,
          askSize: event.asksz,
          last: (event.bid + event.ask) / 2, // Midpoint as estimate
          timestamp: new Date(event.biddate),
        };
        return {
          type: 'quote',
          symbol: event.symbol,
          data: quote,
          rawEvent: event,
        };
      }

      case 'trade': {
        const trade: StreamingTrade = {
          symbol: event.symbol,
          price: event.price,
          size: event.size,
          timestamp: new Date(event.date),
          exchange: event.exch,
          cumulativeVolume: event.cvol,
        };
        return {
          type: 'trade',
          symbol: event.symbol,
          data: trade,
          rawEvent: event,
        };
      }

      case 'timesale': {
        let condition: 'at_bid' | 'at_ask' | 'between' = 'between';
        if (event.last <= event.bid) {
          condition = 'at_bid';
        } else if (event.last >= event.ask) {
          condition = 'at_ask';
        }

        const timesale: StreamingTimesale = {
          symbol: event.symbol,
          price: event.last,
          size: event.size,
          timestamp: new Date(event.date),
          exchange: event.exch,
          bid: event.bid,
          ask: event.ask,
          condition,
        };
        return {
          type: 'timesale',
          symbol: event.symbol,
          data: timesale,
          rawEvent: event,
        };
      }

      default:
        return null;
    }
  }

  /**
   * WebSocket close handler
   */
  private onClose(code: number, reason: string): void {
    this.logger.warn(`WebSocket closed: ${code} - ${reason}`);
    this.isConnecting = false;
    this.ws = null;

    if (!this.isShuttingDown && this.subscribedSymbols.size > 0) {
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket error handler
   */
  private onError(error: Error): void {
    this.logger.error(`WebSocket error: ${error.message}`);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimeout) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000,
    );
    this.reconnectAttempts++;

    this.logger.log(
      `Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      void this.connect();
    }, delay);
  }

  /**
   * Refresh session (called periodically)
   */
  private async refreshSession(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.sessionId = await this.createSession();
      this.sendSubscription();
      this.logger.debug('Refreshed Tradier streaming session');
    } catch (error) {
      this.logger.error(
        `Failed to refresh session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
