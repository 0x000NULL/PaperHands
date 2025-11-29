import { Injectable, Logger } from '@nestjs/common';

/**
 * Service to track which clients are subscribed to which symbols.
 * Uses two-way maps for efficient lookups in both directions.
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  // Map of symbol -> Set of client IDs
  private symbolToClients = new Map<string, Set<string>>();

  // Map of client ID -> Set of symbols
  private clientToSymbols = new Map<string, Set<string>>();

  /**
   * Subscribe a client to a symbol
   */
  subscribe(clientId: string, symbol: string): void {
    const upperSymbol = symbol.toUpperCase();

    // Add to symbol -> clients map
    if (!this.symbolToClients.has(upperSymbol)) {
      this.symbolToClients.set(upperSymbol, new Set());
    }
    this.symbolToClients.get(upperSymbol)!.add(clientId);

    // Add to client -> symbols map
    if (!this.clientToSymbols.has(clientId)) {
      this.clientToSymbols.set(clientId, new Set());
    }
    this.clientToSymbols.get(clientId)!.add(upperSymbol);

    this.logger.debug(
      `Client ${clientId} subscribed to ${upperSymbol}. Total subscribers: ${this.symbolToClients.get(upperSymbol)!.size}`,
    );
  }

  /**
   * Unsubscribe a client from a symbol
   */
  unsubscribe(clientId: string, symbol: string): void {
    const upperSymbol = symbol.toUpperCase();

    // Remove from symbol -> clients map
    const clients = this.symbolToClients.get(upperSymbol);
    if (clients) {
      clients.delete(clientId);
      if (clients.size === 0) {
        this.symbolToClients.delete(upperSymbol);
      }
    }

    // Remove from client -> symbols map
    const symbols = this.clientToSymbols.get(clientId);
    if (symbols) {
      symbols.delete(upperSymbol);
      if (symbols.size === 0) {
        this.clientToSymbols.delete(clientId);
      }
    }

    this.logger.debug(`Client ${clientId} unsubscribed from ${upperSymbol}`);
  }

  /**
   * Remove a client from all subscriptions
   */
  removeClient(clientId: string): void {
    const symbols = this.clientToSymbols.get(clientId);
    if (symbols) {
      for (const symbol of symbols) {
        const clients = this.symbolToClients.get(symbol);
        if (clients) {
          clients.delete(clientId);
          if (clients.size === 0) {
            this.symbolToClients.delete(symbol);
          }
        }
      }
      this.clientToSymbols.delete(clientId);
    }

    this.logger.debug(`Client ${clientId} removed from all subscriptions`);
  }

  /**
   * Get all symbols a client is subscribed to
   */
  getClientSymbols(clientId: string): string[] {
    const symbols = this.clientToSymbols.get(clientId);
    return symbols ? Array.from(symbols) : [];
  }

  /**
   * Get all clients subscribed to a symbol
   */
  getSymbolClients(symbol: string): string[] {
    const upperSymbol = symbol.toUpperCase();
    const clients = this.symbolToClients.get(upperSymbol);
    return clients ? Array.from(clients) : [];
  }

  /**
   * Check if a symbol has any subscribers
   */
  hasSubscribers(symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    const clients = this.symbolToClients.get(upperSymbol);
    return clients !== undefined && clients.size > 0;
  }

  /**
   * Get subscriber count for a symbol
   */
  getSubscriberCount(symbol: string): number {
    const upperSymbol = symbol.toUpperCase();
    const clients = this.symbolToClients.get(upperSymbol);
    return clients ? clients.size : 0;
  }

  /**
   * Get total number of subscriptions across all clients
   */
  getTotalSubscriptions(): number {
    let count = 0;
    for (const clients of this.symbolToClients.values()) {
      count += clients.size;
    }
    return count;
  }

  /**
   * Get all subscribed symbols
   */
  getAllSymbols(): string[] {
    return Array.from(this.symbolToClients.keys());
  }

  /**
   * Check if a client is subscribed to a symbol
   */
  isSubscribed(clientId: string, symbol: string): boolean {
    const upperSymbol = symbol.toUpperCase();
    const symbols = this.clientToSymbols.get(clientId);
    return symbols !== undefined && symbols.has(upperSymbol);
  }
}
