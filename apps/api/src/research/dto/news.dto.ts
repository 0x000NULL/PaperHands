import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsString,
  Matches,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NewsCategory } from '../enums';

export class MarketNewsQueryDto {
  @IsOptional()
  @IsEnum(NewsCategory)
  category?: NewsCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}

export class CompanyNewsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class NewsItemResponseDto {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image: string | null;
  category: string;
  datetime: number;
  related: string[];
}
