import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from './alerts.service';
import { NotificationsService } from './notifications.service';
import { Alert } from '../entities/alert.entity';
import { AlertType } from '../enums/alert-type.enum';
import { AlertCondition } from '../enums/alert-condition.enum';
import { NotificationType } from '../enums/notification-type.enum';
import { PortfolioService } from '../../portfolio/portfolio.service';
import { PortfolioGreeksService } from '../../portfolio/services/portfolio-greeks.service';
import type {
  NormalizedStreamEvent,
  StreamingQuote,
  StreamingTrade,
} from '../../streaming/interfaces/streaming.interfaces';

interface AlertCache {
  alerts: Alert[];
  lastUpdated: Date;
}

@Injectable()
export class AlertMonitorService implements OnModuleInit {
  private readonly logger = new Logger(AlertMonitorService.name);

  // Cache alerts by symbol for fast lookup during streaming
  private alertsBySymbol: Map<string, AlertCache> = new Map();

  // Track last known prices for percent change calculations
  private lastPrices: Map<string, number> = new Map();
  private openPrices: Map<string, number> = new Map();

  // Cache refresh interval (5 minutes)
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly alertsService: AlertsService,
    private readonly notificationsService: NotificationsService,
    private readonly portfolioService: PortfolioService,
    private readonly portfolioGreeksService: PortfolioGreeksService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('AlertMonitorService initializing...');
    await this.refreshAlertCache();
    this.logger.log('AlertMonitorService initialized');
  }

  /**
   * Refresh the alert cache from database
   */
  async refreshAlertCache(): Promise<void> {
    try {
      const alerts = await this.alertsService.findAllActive();
      this.alertsBySymbol.clear();

      for (const alert of alerts) {
        if (!alert.symbol) continue; // Skip portfolio-level alerts

        if (!this.alertsBySymbol.has(alert.symbol)) {
          this.alertsBySymbol.set(alert.symbol, {
            alerts: [],
            lastUpdated: new Date(),
          });
        }
        this.alertsBySymbol.get(alert.symbol)!.alerts.push(alert);
      }

      this.logger.log(
        `Alert cache refreshed: ${alerts.length} active alerts for ${this.alertsBySymbol.size} symbols`,
      );
    } catch (error) {
      this.logger.error('Failed to refresh alert cache:', error);
    }
  }

  /**
   * Refresh cache periodically
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCacheRefresh(): Promise<void> {
    await this.refreshAlertCache();
  }

  /**
   * Handle streaming events and check alerts
   */
  @OnEvent('stream.event')
  async handleStreamEvent(event: NormalizedStreamEvent): Promise<void> {
    const { symbol, type, data } = event;

    // Get price from event
    let price: number | undefined;
    let volume: number | undefined;

    if (type === 'quote') {
      const quote = data as StreamingQuote;
      price = quote.last || (quote.bid + quote.ask) / 2;
    } else if (type === 'trade') {
      const trade = data as StreamingTrade;
      price = trade.price;
      volume = trade.cumulativeVolume;
    }

    if (!price) return;

    // Update price tracking
    const prevPrice = this.lastPrices.get(symbol);
    this.lastPrices.set(symbol, price);

    // Get alerts for this symbol
    const cache = this.alertsBySymbol.get(symbol);
    if (!cache || cache.alerts.length === 0) return;

    // Check each alert
    for (const alert of cache.alerts) {
      if (!alert.isActive) continue;

      try {
        const triggered = await this.evaluateAlert(
          alert,
          price,
          prevPrice,
          volume,
        );
        if (triggered) {
          await this.triggerAlert(alert, price);
        }
      } catch (error) {
        this.logger.error(`Error evaluating alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Evaluate whether an alert should trigger
   */
  private async evaluateAlert(
    alert: Alert,
    currentPrice: number,
    prevPrice: number | undefined,
    volume?: number,
  ): Promise<boolean> {
    let currentValue: number;

    switch (alert.type) {
      case AlertType.PRICE:
        currentValue = currentPrice;
        break;

      case AlertType.PERCENT_CHANGE:
        const openPrice = this.openPrices.get(alert.symbol);
        if (!openPrice) return false;
        currentValue = ((currentPrice - openPrice) / openPrice) * 100;
        break;

      case AlertType.VOLUME:
        if (volume === undefined) return false;
        currentValue = volume;
        break;

      default:
        // GREEKS, PORTFOLIO_VALUE, EARNINGS handled by cron jobs
        return false;
    }

    const targetValue = Number(alert.targetValue);
    const lastCheckedValue =
      alert.lastCheckedValue !== null
        ? Number(alert.lastCheckedValue)
        : undefined;

    let triggered = false;

    switch (alert.condition) {
      case AlertCondition.ABOVE:
        triggered = currentValue >= targetValue;
        break;

      case AlertCondition.BELOW:
        triggered = currentValue <= targetValue;
        break;

      case AlertCondition.CROSSES:
        if (lastCheckedValue !== undefined) {
          // Check if crossed from one side to the other
          const wasBelow = lastCheckedValue < targetValue;
          const wasAbove = lastCheckedValue > targetValue;
          const isBelow = currentValue < targetValue;
          const isAbove = currentValue > targetValue;
          triggered = (wasBelow && isAbove) || (wasAbove && isBelow);
        }
        break;
    }

    // Update last checked value for CROSSES alerts
    if (alert.condition === AlertCondition.CROSSES && !triggered) {
      await this.alertsService.updateLastCheckedValue(alert.id, currentValue);
    }

    return triggered;
  }

  /**
   * Trigger an alert and send notification
   */
  private async triggerAlert(
    alert: Alert,
    currentValue: number,
  ): Promise<void> {
    this.logger.log(
      `Alert triggered: ${alert.id} for ${alert.symbol} at ${currentValue}`,
    );

    // Deactivate alert (one-time)
    await this.alertsService.deactivate(alert.id);

    // Remove from cache
    this.removeAlertFromCache(alert);

    // Create notification
    const title = this.formatAlertTitle(alert);
    const message = this.formatAlertMessage(alert, currentValue);

    await this.notificationsService.create({
      userId: alert.userId,
      type: NotificationType.ALERT_TRIGGERED,
      title,
      message,
      metadata: {
        alertId: alert.id,
        symbol: alert.symbol,
        alertType: alert.type,
        condition: alert.condition,
        targetValue: alert.targetValue,
        triggeredValue: currentValue,
      },
    });
  }

  private formatAlertTitle(alert: Alert): string {
    const symbol = alert.symbol || 'Portfolio';
    const typeLabels: Record<AlertType, string> = {
      [AlertType.PRICE]: 'Price Alert',
      [AlertType.PERCENT_CHANGE]: 'Change Alert',
      [AlertType.VOLUME]: 'Volume Alert',
      [AlertType.GREEKS]: `${alert.greekType?.toUpperCase()} Alert`,
      [AlertType.PORTFOLIO_VALUE]: 'Portfolio Alert',
      [AlertType.EARNINGS]: 'Earnings Alert',
    };
    return `${typeLabels[alert.type]}: ${symbol}`;
  }

  private formatAlertMessage(alert: Alert, currentValue: number): string {
    const conditionLabels: Record<AlertCondition, string> = {
      [AlertCondition.ABOVE]: 'reached',
      [AlertCondition.BELOW]: 'dropped to',
      [AlertCondition.CROSSES]: 'crossed',
    };

    const action = conditionLabels[alert.condition];
    const target = Number(alert.targetValue);

    switch (alert.type) {
      case AlertType.PRICE:
        return `${alert.symbol} ${action} $${currentValue.toFixed(2)} (target: $${target.toFixed(2)})`;

      case AlertType.PERCENT_CHANGE:
        const sign = currentValue >= 0 ? '+' : '';
        return `${alert.symbol} ${action} ${sign}${currentValue.toFixed(2)}% (target: ${target >= 0 ? '+' : ''}${target.toFixed(2)}%)`;

      case AlertType.VOLUME:
        return `${alert.symbol} volume ${action} ${this.formatVolume(currentValue)} (target: ${this.formatVolume(target)})`;

      default:
        return `Alert triggered at ${currentValue}`;
    }
  }

  private formatVolume(volume: number): string {
    if (volume >= 1_000_000_000) {
      return `${(volume / 1_000_000_000).toFixed(2)}B`;
    }
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    }
    if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toString();
  }

  private removeAlertFromCache(alert: Alert): void {
    if (!alert.symbol) return;

    const cache = this.alertsBySymbol.get(alert.symbol);
    if (cache) {
      cache.alerts = cache.alerts.filter((a) => a.id !== alert.id);
      if (cache.alerts.length === 0) {
        this.alertsBySymbol.delete(alert.symbol);
      }
    }
  }

  /**
   * Add a new alert to the cache (called when user creates alert)
   */
  addAlertToCache(alert: Alert): void {
    if (!alert.symbol || !alert.isActive) return;

    if (!this.alertsBySymbol.has(alert.symbol)) {
      this.alertsBySymbol.set(alert.symbol, {
        alerts: [],
        lastUpdated: new Date(),
      });
    }
    this.alertsBySymbol.get(alert.symbol)!.alerts.push(alert);
  }

  /**
   * Update open prices (called at market open)
   */
  setOpenPrice(symbol: string, price: number): void {
    this.openPrices.set(symbol, price);
  }

  /**
   * Get monitoring stats
   */
  getStats(): {
    cachedSymbols: number;
    totalAlerts: number;
    trackedPrices: number;
  } {
    let totalAlerts = 0;
    for (const cache of this.alertsBySymbol.values()) {
      totalAlerts += cache.alerts.length;
    }

    return {
      cachedSymbols: this.alertsBySymbol.size,
      totalAlerts,
      trackedPrices: this.lastPrices.size,
    };
  }

  /**
   * Check Portfolio Value alerts every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkPortfolioValueAlerts(): Promise<void> {
    try {
      const portfolioAlerts = await this.alertsService.findActiveByType(
        AlertType.PORTFOLIO_VALUE,
      );

      if (portfolioAlerts.length === 0) return;

      // Group alerts by userId
      const alertsByUser = new Map<string, Alert[]>();
      for (const alert of portfolioAlerts) {
        if (!alertsByUser.has(alert.userId)) {
          alertsByUser.set(alert.userId, []);
        }
        alertsByUser.get(alert.userId)!.push(alert);
      }

      // Check alerts for each user
      for (const [userId, userAlerts] of alertsByUser) {
        try {
          const portfolio = await this.portfolioService.getPortfolio(userId);
          const totalValue = portfolio.totalValue;

          for (const alert of userAlerts) {
            const triggered = this.checkCondition(
              totalValue,
              Number(alert.targetValue),
              alert.condition,
              alert.lastCheckedValue !== null
                ? Number(alert.lastCheckedValue)
                : undefined,
            );

            if (triggered) {
              await this.triggerPortfolioAlert(alert, totalValue);
            } else if (alert.condition === AlertCondition.CROSSES) {
              await this.alertsService.updateLastCheckedValue(
                alert.id,
                totalValue,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to check portfolio alerts for user ${userId}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to check portfolio value alerts:', error);
    }
  }

  /**
   * Check Greeks alerts every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkGreeksAlerts(): Promise<void> {
    try {
      const greeksAlerts = await this.alertsService.findActiveByType(
        AlertType.GREEKS,
      );

      if (greeksAlerts.length === 0) return;

      // Group alerts by userId
      const alertsByUser = new Map<string, Alert[]>();
      for (const alert of greeksAlerts) {
        if (!alertsByUser.has(alert.userId)) {
          alertsByUser.set(alert.userId, []);
        }
        alertsByUser.get(alert.userId)!.push(alert);
      }

      // Check alerts for each user
      for (const [userId, userAlerts] of alertsByUser) {
        try {
          const greeksSummary =
            await this.portfolioGreeksService.getPortfolioGreeks(userId);

          for (const alert of userAlerts) {
            const greekType = alert.greekType?.toLowerCase();
            let currentValue: number;

            switch (greekType) {
              case 'delta':
                currentValue = greeksSummary.netDelta;
                break;
              case 'gamma':
                currentValue = greeksSummary.netGamma;
                break;
              case 'theta':
                currentValue = greeksSummary.netTheta;
                break;
              case 'vega':
                currentValue = greeksSummary.netVega;
                break;
              case 'rho':
                currentValue = greeksSummary.netRho;
                break;
              default:
                this.logger.warn(`Unknown greek type: ${greekType}`);
                continue;
            }

            const triggered = this.checkCondition(
              currentValue,
              Number(alert.targetValue),
              alert.condition,
              alert.lastCheckedValue !== null
                ? Number(alert.lastCheckedValue)
                : undefined,
            );

            if (triggered) {
              await this.triggerGreeksAlert(alert, currentValue);
            } else if (alert.condition === AlertCondition.CROSSES) {
              await this.alertsService.updateLastCheckedValue(
                alert.id,
                currentValue,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `Failed to check Greeks alerts for user ${userId}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to check Greeks alerts:', error);
    }
  }

  /**
   * Check a condition against target and current values
   */
  private checkCondition(
    currentValue: number,
    targetValue: number,
    condition: AlertCondition,
    lastCheckedValue?: number,
  ): boolean {
    switch (condition) {
      case AlertCondition.ABOVE:
        return currentValue >= targetValue;

      case AlertCondition.BELOW:
        return currentValue <= targetValue;

      case AlertCondition.CROSSES:
        if (lastCheckedValue !== undefined) {
          const wasBelow = lastCheckedValue < targetValue;
          const wasAbove = lastCheckedValue > targetValue;
          const isBelow = currentValue < targetValue;
          const isAbove = currentValue > targetValue;
          return (wasBelow && isAbove) || (wasAbove && isBelow);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Trigger a portfolio value alert
   */
  private async triggerPortfolioAlert(
    alert: Alert,
    currentValue: number,
  ): Promise<void> {
    this.logger.log(
      `Portfolio alert triggered: ${alert.id} at $${currentValue.toFixed(2)}`,
    );

    await this.alertsService.deactivate(alert.id);

    const title = 'Portfolio Value Alert';
    const conditionLabels: Record<AlertCondition, string> = {
      [AlertCondition.ABOVE]: 'reached',
      [AlertCondition.BELOW]: 'dropped to',
      [AlertCondition.CROSSES]: 'crossed',
    };
    const action = conditionLabels[alert.condition];
    const target = Number(alert.targetValue);
    const message = `Portfolio value ${action} $${currentValue.toFixed(2)} (target: $${target.toFixed(2)})`;

    await this.notificationsService.create({
      userId: alert.userId,
      type: NotificationType.ALERT_TRIGGERED,
      title,
      message,
      metadata: {
        alertId: alert.id,
        alertType: alert.type,
        condition: alert.condition,
        targetValue: alert.targetValue,
        triggeredValue: currentValue,
      },
    });
  }

  /**
   * Trigger a Greeks alert
   */
  private async triggerGreeksAlert(
    alert: Alert,
    currentValue: number,
  ): Promise<void> {
    const greekName =
      alert.greekType?.charAt(0).toUpperCase() +
      (alert.greekType?.slice(1) || '');
    this.logger.log(
      `Greeks alert triggered: ${alert.id} - ${greekName} at ${currentValue.toFixed(4)}`,
    );

    await this.alertsService.deactivate(alert.id);

    const title = `${greekName} Alert`;
    const conditionLabels: Record<AlertCondition, string> = {
      [AlertCondition.ABOVE]: 'reached',
      [AlertCondition.BELOW]: 'dropped to',
      [AlertCondition.CROSSES]: 'crossed',
    };
    const action = conditionLabels[alert.condition];
    const target = Number(alert.targetValue);
    const message = `Portfolio ${greekName} ${action} ${currentValue.toFixed(4)} (target: ${target.toFixed(4)})`;

    await this.notificationsService.create({
      userId: alert.userId,
      type: NotificationType.ALERT_TRIGGERED,
      title,
      message,
      metadata: {
        alertId: alert.id,
        alertType: alert.type,
        greekType: alert.greekType,
        condition: alert.condition,
        targetValue: alert.targetValue,
        triggeredValue: currentValue,
      },
    });
  }
}
