import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AlertType } from '../enums/alert-type.enum';

export class QueryAlertsDto {
  @IsOptional()
  @IsEnum(AlertType)
  type?: AlertType;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, { message: 'Symbol must be 1-5 uppercase letters' })
  symbol?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
