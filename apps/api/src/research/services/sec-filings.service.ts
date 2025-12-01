import { Injectable } from '@nestjs/common';
import { FinnhubService } from '../../market-data/finnhub.service';
import { SecFilingsQueryDto, FilingResponseDto } from '../dto';

@Injectable()
export class SecFilingsService {
  constructor(private readonly finnhubService: FinnhubService) {}

  async getFilings(
    symbol: string,
    query: SecFilingsQueryDto,
  ): Promise<FilingResponseDto[]> {
    const filings = await this.finnhubService.getSecFilings(
      symbol,
      query.from,
      query.to,
    );

    // Filter by form type if specified
    if (query.form) {
      return filings.filter((f) => f.form === query.form);
    }

    return filings;
  }
}
