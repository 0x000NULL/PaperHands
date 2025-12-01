import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Matches,
  MaxLength,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AlertType } from '../enums/alert-type.enum';
import { AlertCondition } from '../enums/alert-condition.enum';

export class CreateAlertDto {
  @IsEnum(AlertType, { message: 'Invalid alert type' })
  type: AlertType;

  // Required for non-portfolio alerts
  @ValidateIf((o: CreateAlertDto) => o.type !== AlertType.PORTFOLIO_VALUE)
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, { message: 'Symbol must be 1-5 uppercase letters' })
  @MaxLength(5)
  symbol?: string;

  @IsEnum(AlertCondition, { message: 'Invalid alert condition' })
  condition: AlertCondition;

  @IsNumber(
    { maxDecimalPlaces: 6 },
    { message: 'Target value must have at most 6 decimal places' },
  )
  @Type(() => Number)
  targetValue: number;

  // Required for GREEKS type
  @ValidateIf((o: CreateAlertDto) => o.type === AlertType.GREEKS)
  @IsString()
  @IsIn(['delta', 'gamma', 'theta', 'vega', 'rho'], {
    message: 'Greek type must be delta, gamma, theta, vega, or rho',
  })
  greekType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
