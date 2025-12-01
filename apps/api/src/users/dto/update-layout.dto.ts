import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WidgetPositionDto } from './create-layout.dto';

export class UpdateLayoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetPositionDto)
  @IsOptional()
  widgets?: WidgetPositionDto[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
