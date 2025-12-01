import { Injectable } from '@nestjs/common';
import { FinnhubService } from '../../market-data/finnhub.service';
import { AnalystRatingsResponseDto } from '../dto';

@Injectable()
export class AnalystRatingsService {
  constructor(private readonly finnhubService: FinnhubService) {}

  async getAnalystRatings(symbol: string): Promise<AnalystRatingsResponseDto> {
    const [recommendations, priceTarget] = await Promise.all([
      this.finnhubService.getRecommendationTrends(symbol),
      this.finnhubService.getPriceTarget(symbol),
    ]);

    const latestRec = recommendations[0];
    let consensusRating = 'N/A';
    let totalAnalysts = 0;

    if (latestRec) {
      totalAnalysts =
        latestRec.strongBuy +
        latestRec.buy +
        latestRec.hold +
        latestRec.sell +
        latestRec.strongSell;

      if (totalAnalysts > 0) {
        // Calculate weighted score: strongBuy=5, buy=4, hold=3, sell=2, strongSell=1
        const weightedScore =
          (latestRec.strongBuy * 5 +
            latestRec.buy * 4 +
            latestRec.hold * 3 +
            latestRec.sell * 2 +
            latestRec.strongSell * 1) /
          totalAnalysts;

        if (weightedScore >= 4.5) consensusRating = 'Strong Buy';
        else if (weightedScore >= 3.5) consensusRating = 'Buy';
        else if (weightedScore >= 2.5) consensusRating = 'Hold';
        else if (weightedScore >= 1.5) consensusRating = 'Sell';
        else consensusRating = 'Strong Sell';
      }
    }

    return {
      symbol: symbol.toUpperCase(),
      recommendations,
      priceTarget,
      consensusRating,
      totalAnalysts,
    };
  }
}
