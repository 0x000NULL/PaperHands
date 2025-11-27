import { IsString, IsNumber, IsEnum, Min } from 'class-validator';
import { OrderSide } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  symbol: string;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsNumber()
  @Min(0.0001)
  quantity: number;
}
