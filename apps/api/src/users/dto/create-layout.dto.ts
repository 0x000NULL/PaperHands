import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WidgetPositionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsBoolean()
  visible: boolean;
}

export class CreateLayoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WidgetPositionDto)
  widgets: WidgetPositionDto[];

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
