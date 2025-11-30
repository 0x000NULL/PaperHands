import { IsOptional, IsEnum, IsString, IsIn } from 'class-validator';
import { OrderType, TimeInForce } from '../../orders/enums/order.enums';
import { CostBasisMethod } from '../../portfolio/enums/cost-basis.enums';

export const VALID_BENCHMARKS = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'] as const;
export type BenchmarkSymbol = (typeof VALID_BENCHMARKS)[number];

export class UpdateTradingPreferencesDto {
  @IsOptional()
  @IsEnum(OrderType)
  defaultOrderType?: OrderType;

  @IsOptional()
  @IsEnum(TimeInForce)
  defaultTimeInForce?: TimeInForce;

  @IsOptional()
  @IsEnum(CostBasisMethod)
  defaultCostBasisMethod?: CostBasisMethod;

  @IsOptional()
  @IsString()
  @IsIn(VALID_BENCHMARKS)
  defaultBenchmarkSymbol?: BenchmarkSymbol;
}
