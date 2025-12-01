import { IsOptional, IsDateString } from 'class-validator';

export class InsiderTransactionsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class InsiderTransactionResponseDto {
  symbol: string;
  name: string;
  share: number;
  change: number;
  filingDate: string;
  transactionDate: string;
  transactionPrice: number | null;
  transactionCode: string;
}

export class InsiderSummaryResponseDto {
  transactions: InsiderTransactionResponseDto[];
  netChange: number;
  totalBuys: number;
  totalSells: number;
}
