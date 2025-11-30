import {
  IsNumber,
  IsString,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class AdjustBalanceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-1000000)
  @Max(1000000)
  adjustment: number;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  reason: string;
}
