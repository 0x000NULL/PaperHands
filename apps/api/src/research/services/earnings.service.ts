import { Injectable } from '@nestjs/common';
import { FinnhubService } from '../../market-data/finnhub.service';
import { EarningsCalendarQueryDto, EarningsReleaseResponseDto } from '../dto';

@Injectable()
export class EarningsService {
  constructor(private readonly finnhubService: FinnhubService) {}

  async getEarningsCalendar(
    query: EarningsCalendarQueryDto,
  ): Promise<EarningsReleaseResponseDto[]> {
    return this.finnhubService.getEarningsCalendar(
      query.from,
      query.to,
      query.symbol,
    );
  }
}
