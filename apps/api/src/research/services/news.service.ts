import { Injectable } from '@nestjs/common';
import { FinnhubService } from '../../market-data/finnhub.service';
import {
  MarketNewsQueryDto,
  CompanyNewsQueryDto,
  NewsItemResponseDto,
} from '../dto';

@Injectable()
export class NewsService {
  constructor(private readonly finnhubService: FinnhubService) {}

  async getMarketNews(
    query: MarketNewsQueryDto,
  ): Promise<NewsItemResponseDto[]> {
    const news = await this.finnhubService.getMarketNews(
      query.category || 'general',
    );
    return news.slice(0, query.limit || 20);
  }

  async getCompanyNews(
    symbol: string,
    query: CompanyNewsQueryDto,
  ): Promise<NewsItemResponseDto[]> {
    return this.finnhubService.getCompanyNews(symbol, query.from, query.to);
  }
}
