import { IsNumber, IsOptional, IsPositive, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrderDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'Quantity must be positive' })
  @Min(0.0001, { message: 'Minimum quantity is 0.0001' })
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Limit price must be positive' })
  @Type(() => Number)
  limitPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Stop price must be positive' })
  @Type(() => Number)
  stopPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'Trail amount must be positive' })
  @Type(() => Number)
  trailAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Trail percent must be at least 0.01%' })
  @Max(50, { message: 'Trail percent cannot exceed 50%' })
  @Type(() => Number)
  trailPercent?: number;
}
