import { Injectable } from '@nestjs/common';
import { FinnhubService } from '../../market-data/finnhub.service';
import { InsiderSummaryResponseDto } from '../dto';

@Injectable()
export class InsiderTradingService {
  constructor(private readonly finnhubService: FinnhubService) {}

  async getInsiderTransactions(
    symbol: string,
  ): Promise<InsiderSummaryResponseDto> {
    const transactions =
      await this.finnhubService.getInsiderTransactions(symbol);

    // Calculate summary stats
    let netChange = 0;
    let totalBuys = 0;
    let totalSells = 0;

    for (const tx of transactions) {
      netChange += tx.change;
      if (tx.change > 0) {
        totalBuys++;
      } else if (tx.change < 0) {
        totalSells++;
      }
    }

    return {
      transactions,
      netChange,
      totalBuys,
      totalSells,
    };
  }
}
