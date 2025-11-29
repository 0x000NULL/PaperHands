import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
  IsEnum,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderType, TimeInForce } from '../../orders/enums/order.enums';
import { CostBasisMethod } from '../../portfolio/enums/cost-basis.enums';

export class CashSetupDto {
  @IsNumber()
  @Min(1000)
  @Max(10000000)
  startingCash: number;
}

export class WatchlistSetupDto {
  @IsString()
  watchlistName: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  symbols: string[];
}

export class TradingPreferencesDto {
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

export class CompleteStepDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CashSetupDto)
  cashSetup?: CashSetupDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WatchlistSetupDto)
  watchlistSetup?: WatchlistSetupDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TradingPreferencesDto)
  preferences?: TradingPreferencesDto;

  @IsOptional()
  @IsString()
  userIntent?: 'stocks' | 'options' | 'testing' | 'exploring';
}
