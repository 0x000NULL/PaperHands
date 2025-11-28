import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateWatchlistDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
