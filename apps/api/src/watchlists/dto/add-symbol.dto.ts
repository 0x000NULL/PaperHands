import { IsString, Matches } from 'class-validator';

export class AddSymbolDto {
  @IsString()
  @Matches(/^[A-Z]{1,10}$/, {
    message: 'Symbol must be 1-10 uppercase letters',
  })
  symbol: string;
}
