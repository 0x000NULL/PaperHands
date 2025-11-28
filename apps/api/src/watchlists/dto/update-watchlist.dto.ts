import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateWatchlistDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
