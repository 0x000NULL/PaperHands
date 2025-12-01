import { Injectable } from '@nestjs/common';
import { FinnhubService } from '../../market-data/finnhub.service';
import { EconomicCalendarQueryDto, EconomicEventResponseDto } from '../dto';

@Injectable()
export class EconomicCalendarService {
  constructor(private readonly finnhubService: FinnhubService) {}

  async getEconomicCalendar(
    query: EconomicCalendarQueryDto,
  ): Promise<EconomicEventResponseDto[]> {
    return this.finnhubService.getEconomicCalendar(query.from, query.to);
  }

  async getHighImpactEvents(
    query: EconomicCalendarQueryDto,
  ): Promise<EconomicEventResponseDto[]> {
    const events = await this.finnhubService.getEconomicCalendar(
      query.from,
      query.to,
    );
    return events.filter(
      (event) => event.impact === 'high' || event.impact === 'HIGH',
    );
  }
}
