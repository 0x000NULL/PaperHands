import { IsOptional, IsString, IsDateString, Matches } from 'class-validator';

export class EarningsCalendarQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, { message: 'Symbol must be 1-5 uppercase letters' })
  symbol?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class EarningsReleaseResponseDto {
  symbol: string;
  date: string;
  hour: string;
  epsActual: number | null;
  epsEstimate: number | null;
  revenueActual: number | null;
  revenueEstimate: number | null;
  quarter: number;
  year: number;
}
