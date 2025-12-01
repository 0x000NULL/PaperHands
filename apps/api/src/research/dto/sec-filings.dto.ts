import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { FilingType } from '../enums';

export class SecFilingsQueryDto {
  @IsOptional()
  @IsEnum(FilingType)
  form?: FilingType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class FilingResponseDto {
  accessNumber: string;
  symbol: string;
  cik: string;
  form: string;
  filedDate: string;
  acceptedDate: string;
  reportUrl: string;
  filingUrl: string;
}
