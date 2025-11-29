import {
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  Matches,
  MaxLength,
  IsOptional,
  IsUUID,
  IsPositive,
  IsBoolean,
  ValidateIf,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  OrderSide,
  OrderType,
  TimeInForce,
  OrderCategory,
  OptionType,
} from '../enums/order.enums';

// Custom decorator for requiring a field for specific order types
function RequiredForOrderTypes(
  orderTypes: OrderType[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'requiredForOrderTypes',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const orderType = (args.object as CreateOrderDto).orderType;
          if (orderTypes.includes(orderType)) {
            return value !== undefined && value !== null;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is required for order types: ${orderTypes.join(', ')}`;
        },
      },
    });
  };
}

// Validator: IOC/FOK cannot be used with stop-based orders
function ValidateIocFokNotWithStopOrders(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateIocFokNotWithStopOrders',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as CreateOrderDto;
          const stopOrderTypes = [
            OrderType.STOP,
            OrderType.STOP_LIMIT,
            OrderType.TRAILING_STOP,
          ];
          if (
            dto.timeInForce &&
            [TimeInForce.IOC, TimeInForce.FOK].includes(dto.timeInForce) &&
            stopOrderTypes.includes(dto.orderType)
          ) {
            return false;
          }
          return true;
        },
        defaultMessage() {
          return 'IOC and FOK orders are not supported for stop order types. Stop orders wait for a trigger condition before executing.';
        },
      },
    });
  };
}

// Validator: Extended hours orders must use limit orders
function ValidateExtendedHoursLimitOnly(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateExtendedHoursLimitOnly',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as CreateOrderDto;
          if (dto.extendedHours && dto.orderType === OrderType.MARKET) {
            return false;
          }
          return true;
        },
        defaultMessage() {
          return 'Market orders are not available during extended hours. Use a limit order instead for safer execution with wider spreads.';
        },
      },
    });
  };
}

// Validator: Options cannot trade in extended hours
function ValidateOptionsNoExtendedHours(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'validateOptionsNoExtendedHours',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments) {
          const dto = args.object as CreateOrderDto;
          if (dto.extendedHours && dto.orderCategory === OrderCategory.OPTION) {
            return false;
          }
          return true;
        },
        defaultMessage() {
          return 'Options cannot be traded during extended hours sessions.';
        },
      },
    });
  };
}

export class CreateOrderDto {
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, { message: 'Symbol must be 1-5 uppercase letters' })
  @MaxLength(5)
  symbol: string;

  @IsEnum(OrderSide, { message: 'Side must be "buy" or "sell"' })
  side: OrderSide;

  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'Quantity must have at most 4 decimal places' },
  )
  @IsPositive({ message: 'Quantity must be a positive number' })
  @Min(0.0001, { message: 'Minimum quantity is 0.0001' })
  @Max(1000000, { message: 'Maximum quantity is 1,000,000' })
  @Type(() => Number)
  quantity: number;

  @IsEnum(OrderType, { message: 'Invalid order type' })
  orderType: OrderType;

  @IsOptional()
  @IsEnum(TimeInForce, {
    message: 'Time in force must be "day", "gtc", "ioc", or "fok"',
  })
  @ValidateIocFokNotWithStopOrders()
  timeInForce?: TimeInForce = TimeInForce.DAY;

  @IsOptional()
  @IsBoolean({ message: 'extendedHours must be a boolean' })
  @ValidateExtendedHoursLimitOnly()
  @ValidateOptionsNoExtendedHours()
  extendedHours?: boolean = false;

  // Required for limit and stop_limit orders
  @ValidateIf((o: CreateOrderDto) =>
    [OrderType.LIMIT, OrderType.STOP_LIMIT].includes(o.orderType),
  )
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Limit price must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Limit price must be positive' })
  @RequiredForOrderTypes([OrderType.LIMIT, OrderType.STOP_LIMIT])
  @Type(() => Number)
  limitPrice?: number;

  // Required for stop and stop_limit orders
  @ValidateIf((o: CreateOrderDto) =>
    [OrderType.STOP, OrderType.STOP_LIMIT].includes(o.orderType),
  )
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Stop price must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Stop price must be positive' })
  @RequiredForOrderTypes([OrderType.STOP, OrderType.STOP_LIMIT])
  @Type(() => Number)
  stopPrice?: number;

  // For trailing_stop - fixed dollar amount
  @ValidateIf(
    (o: CreateOrderDto) =>
      o.orderType === OrderType.TRAILING_STOP && !o.trailPercent,
  )
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Trail amount must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Trail amount must be positive' })
  @Type(() => Number)
  trailAmount?: number;

  // For trailing_stop - percentage
  @ValidateIf(
    (o: CreateOrderDto) =>
      o.orderType === OrderType.TRAILING_STOP && !o.trailAmount,
  )
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Trail percent must have at most 2 decimal places' },
  )
  @Min(0.01, { message: 'Trail percent must be at least 0.01%' })
  @Max(50, { message: 'Trail percent cannot exceed 50%' })
  @Type(() => Number)
  trailPercent?: number;

  @IsOptional()
  @IsString()
  @IsUUID('4', { message: 'Idempotency key must be a valid UUID v4' })
  idempotencyKey?: string;

  // Option-specific fields
  @IsOptional()
  @IsEnum(OrderCategory, {
    message: 'Order category must be "equity" or "option"',
  })
  orderCategory?: OrderCategory = OrderCategory.EQUITY;

  // OCC symbol format: ROOT(1-6) + YYMMDD + C/P + STRIKE(8 digits)
  // Example: AAPL240119C00190000
  @ValidateIf((o: CreateOrderDto) => o.orderCategory === OrderCategory.OPTION)
  @IsString()
  @Matches(/^[A-Z]{1,6}\d{6}[CP]\d{8}$/, {
    message: 'Invalid OCC option symbol format (e.g., AAPL240119C00190000)',
  })
  optionSymbol?: string;

  @ValidateIf((o: CreateOrderDto) => o.orderCategory === OrderCategory.OPTION)
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, {
    message: 'Underlying symbol must be 1-5 uppercase letters',
  })
  underlyingSymbol?: string;

  @ValidateIf((o: CreateOrderDto) => o.orderCategory === OrderCategory.OPTION)
  @IsEnum(OptionType, { message: 'Option type must be "call" or "put"' })
  optionType?: OptionType;

  @ValidateIf((o: CreateOrderDto) => o.orderCategory === OrderCategory.OPTION)
  @IsNumber(
    { maxDecimalPlaces: 4 },
    { message: 'Strike price must have at most 4 decimal places' },
  )
  @IsPositive({ message: 'Strike price must be positive' })
  @Type(() => Number)
  strikePrice?: number;

  @ValidateIf((o: CreateOrderDto) => o.orderCategory === OrderCategory.OPTION)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Expiration date must be in YYYY-MM-DD format',
  })
  expirationDate?: string;
}
