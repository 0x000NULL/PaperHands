import {
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Matches,
  MaxLength,
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
  @Min(0.0001)
  quantity: number;
}
