import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderStatus, OrderSide } from '../enums/order.enums';

export class QueryOrdersDto {
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  @IsEnum(OrderStatus, { each: true, message: 'Invalid order status' })
  status?: OrderStatus[];

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string | undefined }) => value?.toUpperCase())
  symbol?: string;

  @IsOptional()
  @IsEnum(OrderSide, { message: 'Side must be "buy" or "sell"' })
  side?: OrderSide;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format for "from"' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invalid date format for "to"' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
