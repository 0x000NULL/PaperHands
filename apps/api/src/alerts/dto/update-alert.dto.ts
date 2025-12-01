import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AlertCondition } from '../enums/alert-condition.enum';

export class UpdateAlertDto {
  @IsOptional()
  @IsEnum(AlertCondition, { message: 'Invalid alert condition' })
  condition?: AlertCondition;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 6 },
    { message: 'Target value must have at most 6 decimal places' },
  )
  @Type(() => Number)
  targetValue?: number;

  @IsOptional()
  @IsString()
  @IsIn(['delta', 'gamma', 'theta', 'vega', 'rho'], {
    message: 'Greek type must be delta, gamma, theta, vega, or rho',
  })
  greekType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
