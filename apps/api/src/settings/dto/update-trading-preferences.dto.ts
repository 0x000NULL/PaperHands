import { IsOptional, IsEnum } from 'class-validator';
import { OrderType, TimeInForce } from '../../orders/enums/order.enums';
import { CostBasisMethod } from '../../portfolio/enums/cost-basis.enums';

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
}
