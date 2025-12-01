import { Injectable, NotFoundException } from '@nestjs/common';
import { FinnhubService } from '../../market-data/finnhub.service';
import { CompanyFundamentalsResponseDto } from '../dto';

@Injectable()
export class FundamentalsService {
  constructor(private readonly finnhubService: FinnhubService) {}

  async getCompanyFundamentals(
    symbol: string,
  ): Promise<CompanyFundamentalsResponseDto> {
    const fundamentals = await this.finnhubService.getBasicFinancials(symbol);

    if (!fundamentals) {
      throw new NotFoundException(
        `Fundamentals not found for symbol ${symbol.toUpperCase()}`,
      );
    }

    return fundamentals;
  }
}
