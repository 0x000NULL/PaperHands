export class CompanyFundamentalsResponseDto {
  symbol: string;
  name: string;
  industry: string;
  country: string;
  exchange: string;
  marketCap: number;
  logo: string;
  weburl: string;
  peRatio: number | null;
  pegRatio: number | null;
  eps: number | null;
  beta: number | null;
  dividendYield: number | null;
  profitMargin: number | null;
  operatingMargin: number | null;
  returnOnEquity: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  week52High: number | null;
  week52Low: number | null;
}
