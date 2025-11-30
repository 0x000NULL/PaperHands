import { OrderType, TimeInForce, OrderSide } from '../enums/order.enums';
import { Order } from '../entities/order.entity';
import { EntityManager } from 'typeorm';

/**
 * Context provided to execution strategies containing all information
 * needed to validate and execute an order.
 */
export interface ExecutionContext {
  /** User ID placing the order */
  userId: string;

  /** Stock symbol (uppercase) */
  symbol: string;

  /** Buy or sell */
  side: OrderSide;

  /** Order type (market, limit, stop, etc.) */
  orderType: OrderType;

  /** Time in force (DAY, GTC, IOC, FOK) */
  timeInForce: TimeInForce;

  /** Quantity to order */
  quantity: number;

  /** Limit price (for limit/stop-limit orders) */
  limitPrice?: number;

  /** Stop price (for stop/stop-limit orders) */
  stopPrice?: number;

  /** Trail amount for trailing stop */
  trailAmount?: number;

  /** Trail percent for trailing stop */
  trailPercent?: number;

  /** Whether extended hours trading is enabled */
  extendedHours: boolean;

  /** Idempotency key for deduplication */
  idempotencyKey?: string;

  /** Current market quote */
  quote: MarketQuote;

  /** Current trading session */
  session: TradingSession;

  /** Entity manager for transaction-scoped operations (optional) */
  manager?: EntityManager;
}

/**
 * Market quote data from data provider.
 */
export interface MarketQuote {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  volume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
}

/**
 * Current trading session.
 */
export type TradingSession =
  | 'pre_market'
  | 'regular'
  | 'after_hours'
  | 'closed';

/**
 * Result of order validation.
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Error messages if validation failed */
  errors: string[];

  /** Warnings that don't block execution */
  warnings?: string[];
}

/**
 * Result of order execution.
 */
export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean;

  /** The executed or created order */
  order: Order;

  /** Execution price (if filled) */
  executionPrice?: number;

  /** Filled quantity (may be less than requested for partial fills) */
  filledQuantity?: number;

  /** Whether the order is pending execution */
  isPending: boolean;

  /** Error message if execution failed */
  errorMessage?: string;
}

/**
 * Order execution strategy interface.
 * Each order type (market, limit, stop, etc.) implements this interface.
 *
 * The Strategy pattern allows us to:
 * 1. Isolate order type-specific logic into focused classes
 * 2. Add new order types without modifying existing code
 * 3. Unit test each strategy independently
 */
export interface IOrderExecutionStrategy {
  /**
   * The order type this strategy handles.
   */
  readonly orderType: OrderType;

  /**
   * Time-in-force values supported by this strategy.
   */
  readonly supportedTimeInForce: TimeInForce[];

  /**
   * Check if this strategy can execute given the current context.
   * For example, market orders require an open trading session.
   *
   * @param context - Execution context
   * @returns true if order can be executed now
   */
  canExecuteImmediately(context: ExecutionContext): boolean;

  /**
   * Validate order parameters against strategy-specific rules.
   *
   * @param context - Execution context
   * @returns Validation result with any errors
   */
  validate(context: ExecutionContext): ValidationResult;

  /**
   * Execute the order according to strategy-specific logic.
   *
   * @param context - Execution context
   * @returns Execution result with the created/filled order
   */
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

/**
 * Token for injecting order execution strategies.
 */
export const ORDER_EXECUTION_STRATEGIES = 'ORDER_EXECUTION_STRATEGIES';
