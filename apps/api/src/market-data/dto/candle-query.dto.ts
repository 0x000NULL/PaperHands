import { IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export const VALID_PERIODS = ['1D', '1W', '1M', '3M', '1Y', '5Y'] as const;
export type Period = (typeof VALID_PERIODS)[number];

export class CandleQueryDto {
  @IsString()
  @Transform(({ value }: { value: string | undefined }) => value?.toUpperCase())
  @IsIn(VALID_PERIODS, {
    message: 'Period must be one of: 1D, 1W, 1M, 3M, 1Y, 5Y',
  })
  period: Period;
}
