export class RecommendationResponseDto {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export class PriceTargetResponseDto {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
  lastUpdated: string;
}

export class AnalystRatingsResponseDto {
  symbol: string;
  recommendations: RecommendationResponseDto[];
  priceTarget: PriceTargetResponseDto | null;
  consensusRating: string;
  totalAnalysts: number;
}
