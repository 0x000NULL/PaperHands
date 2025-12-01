import { IsOptional, IsDateString } from 'class-validator';

export class EconomicCalendarQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class EconomicEventResponseDto {
  country: string;
  event: string;
  time: string;
  impact: string;
  actual: number | null;
  estimate: number | null;
  previous: number | null;
  unit: string;
}
