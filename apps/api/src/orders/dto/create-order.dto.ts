import {
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Matches,
  MaxLength,
  IsOptional,
  IsUUID,
  IsPositive,
} from 'class-validator';
import { OrderSide } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, { message: 'Symbol must be 1-5 uppercase letters' })
  @MaxLength(5)
  symbol: string;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsNumber()
  @IsPositive({ message: 'Quantity must be a positive number' })
  @Min(0.0001, { message: 'Minimum quantity is 0.0001' })
  quantity: number;

  @IsOptional()
  @IsString()
  @IsUUID('4', { message: 'Idempotency key must be a valid UUID v4' })
  idempotencyKey?: string;
}
