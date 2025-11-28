import { Injectable } from '@nestjs/common';

export type TradingSession =
  | 'pre_market'
  | 'regular'
  | 'after_hours'
  | 'closed';

export interface MarketHoursInfo {
  session: TradingSession;
  isOpen: boolean;
  nextOpen: Date | null;
  nextClose: Date | null;
}

interface EasternTimeComponents {
  hours: number;
  minutes: number;
  dayOfWeek: number;
  year: number;
  month: number;
  day: number;
}

@Injectable()
export class MarketHoursService {
  // US market hours in Eastern Time
  private readonly PRE_MARKET_START = { hour: 4, minute: 0 };
  private readonly MARKET_OPEN = { hour: 9, minute: 30 };
  private readonly MARKET_CLOSE = { hour: 16, minute: 0 };
  private readonly AFTER_HOURS_END = { hour: 20, minute: 0 };

  // Intl formatter for reliable timezone conversion
  private readonly etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });

  /**
   * Get time components in Eastern Time using Intl.DateTimeFormat
   * This is more reliable than parsing locale strings
   */
  private getEasternTimeComponents(date: Date): EasternTimeComponents {
    const parts = this.etFormatter.formatToParts(date);
    const partMap = new Map<string, string>();
    for (const part of parts) {
      partMap.set(part.type, part.value);
    }

    // Map weekday abbreviation to day number (0 = Sunday)
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return {
      hours: parseInt(partMap.get('hour') || '0', 10),
      minutes: parseInt(partMap.get('minute') || '0', 10),
      dayOfWeek: weekdayMap[partMap.get('weekday') || 'Sun'] ?? 0,
      year: parseInt(partMap.get('year') || '0', 10),
      month: parseInt(partMap.get('month') || '1', 10),
      day: parseInt(partMap.get('day') || '1', 10),
    };
  }

  /**
   * Get minutes since midnight in Eastern Time
   */
  private getEasternMinutesSinceMidnight(date: Date): number {
    const { hours, minutes } = this.getEasternTimeComponents(date);
    return hours * 60 + minutes;
  }

  /**
   * Get the current trading session
   */
  getCurrentSession(): TradingSession {
    const now = new Date();
    const et = this.getEasternTimeComponents(now);

    // Weekend check (0 = Sunday, 6 = Saturday)
    if (et.dayOfWeek === 0 || et.dayOfWeek === 6) {
      return 'closed';
    }

    const currentMinutes = et.hours * 60 + et.minutes;
    const preMarketMinutes =
      this.PRE_MARKET_START.hour * 60 + this.PRE_MARKET_START.minute;
    const openMinutes = this.MARKET_OPEN.hour * 60 + this.MARKET_OPEN.minute;
    const closeMinutes = this.MARKET_CLOSE.hour * 60 + this.MARKET_CLOSE.minute;
    const afterHoursEndMinutes =
      this.AFTER_HOURS_END.hour * 60 + this.AFTER_HOURS_END.minute;

    if (currentMinutes >= preMarketMinutes && currentMinutes < openMinutes) {
      return 'pre_market';
    }
    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return 'regular';
    }
    if (
      currentMinutes >= closeMinutes &&
      currentMinutes < afterHoursEndMinutes
    ) {
      return 'after_hours';
    }

    return 'closed';
  }

  /**
   * Check if regular market hours are active
   */
  isRegularHours(): boolean {
    return this.getCurrentSession() === 'regular';
  }

  /**
   * Check if pre-market hours are active
   */
  isPreMarket(): boolean {
    return this.getCurrentSession() === 'pre_market';
  }

  /**
   * Check if after-hours are active
   */
  isAfterHours(): boolean {
    return this.getCurrentSession() === 'after_hours';
  }

  /**
   * Check if any extended hours session is active
   */
  isExtendedHours(): boolean {
    const session = this.getCurrentSession();
    return session === 'pre_market' || session === 'after_hours';
  }

  /**
   * Check if any trading session is open (including extended hours)
   */
  isAnySessionOpen(): boolean {
    return this.getCurrentSession() !== 'closed';
  }

  /**
   * Create a Date object for a specific time in Eastern Time
   * Uses UTC offset calculation for accuracy
   */
  private createEasternDate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
  ): Date {
    // Create a date in UTC that represents the desired Eastern Time
    // First create the date, then adjust for the ET offset
    const tempDate = new Date(
      Date.UTC(year, month - 1, day, hour + 5, minute, 0, 0),
    );

    // Check if this date is in DST (EDT = UTC-4) or standard time (EST = UTC-5)
    // We do this by checking if the month is in DST range (roughly March-November)
    const isDST = this.isDateInDST(year, month, day);
    if (isDST) {
      // EDT is UTC-4, so subtract 1 hour from the UTC+5 estimate
      tempDate.setUTCHours(tempDate.getUTCHours() - 1);
    }

    return tempDate;
  }

  /**
   * Approximate DST check (US rules: 2nd Sunday March to 1st Sunday November)
   */
  private isDateInDST(year: number, month: number, day: number): boolean {
    // DST in US: Starts 2nd Sunday of March, ends 1st Sunday of November
    if (month < 3 || month > 11) return false;
    if (month > 3 && month < 11) return true;

    // March: DST starts on 2nd Sunday
    if (month === 3) {
      const secondSunday = this.getNthWeekdayOfMonth(year, 3, 0, 2);
      return day >= secondSunday;
    }

    // November: DST ends on 1st Sunday
    if (month === 11) {
      const firstSunday = this.getNthWeekdayOfMonth(year, 11, 0, 1);
      return day < firstSunday;
    }

    return false;
  }

  /**
   * Get the day of month for the Nth occurrence of a weekday
   */
  private getNthWeekdayOfMonth(
    year: number,
    month: number,
    weekday: number,
    n: number,
  ): number {
    const firstOfMonth = new Date(year, month - 1, 1);
    const firstWeekday = firstOfMonth.getDay();
    let dayOfMonth = 1 + ((weekday - firstWeekday + 7) % 7);
    dayOfMonth += (n - 1) * 7;
    return dayOfMonth;
  }

  /**
   * Get the market close time for a given date in Eastern Time
   * Returns a proper UTC Date object representing 4 PM ET on that day
   */
  getMarketCloseForDate(year: number, month: number, day: number): Date {
    return this.createEasternDate(
      year,
      month,
      day,
      this.MARKET_CLOSE.hour,
      this.MARKET_CLOSE.minute,
    );
  }

  /**
   * Get the market close time for today
   */
  getMarketCloseToday(): Date {
    const now = new Date();
    const et = this.getEasternTimeComponents(now);
    return this.getMarketCloseForDate(et.year, et.month, et.day);
  }

  /**
   * Get the next market close time (handles if today's close has passed)
   */
  getNextMarketClose(): Date {
    const now = new Date();
    const et = this.getEasternTimeComponents(now);
    const currentMinutes = et.hours * 60 + et.minutes;
    const closeMinutes = this.MARKET_CLOSE.hour * 60 + this.MARKET_CLOSE.minute;

    let targetDay = et.day;
    let targetMonth = et.month;
    let targetYear = et.year;
    let dayOfWeek = et.dayOfWeek;

    // If market close has passed today, move to next day
    if (currentMinutes >= closeMinutes) {
      const nextDate = new Date(et.year, et.month - 1, et.day + 1);
      targetYear = nextDate.getFullYear();
      targetMonth = nextDate.getMonth() + 1;
      targetDay = nextDate.getDate();
      dayOfWeek = nextDate.getDay();
    }

    // Skip weekends
    if (dayOfWeek === 6) {
      // Saturday -> Monday
      const nextDate = new Date(targetYear, targetMonth - 1, targetDay + 2);
      targetYear = nextDate.getFullYear();
      targetMonth = nextDate.getMonth() + 1;
      targetDay = nextDate.getDate();
    } else if (dayOfWeek === 0) {
      // Sunday -> Monday
      const nextDate = new Date(targetYear, targetMonth - 1, targetDay + 1);
      targetYear = nextDate.getFullYear();
      targetMonth = nextDate.getMonth() + 1;
      targetDay = nextDate.getDate();
    }

    return this.getMarketCloseForDate(targetYear, targetMonth, targetDay);
  }

  /**
   * Get full market hours info
   */
  getMarketHoursInfo(): MarketHoursInfo {
    const session = this.getCurrentSession();
    const isOpen = session !== 'closed';

    return {
      session,
      isOpen,
      nextOpen: isOpen ? null : this.getNextMarketOpen(),
      nextClose: isOpen ? this.getMarketCloseToday() : null,
    };
  }

  /**
   * Get the next market open time
   */
  private getNextMarketOpen(): Date {
    const now = new Date();
    const et = this.getEasternTimeComponents(now);
    const currentMinutes = et.hours * 60 + et.minutes;
    const afterHoursEndMinutes =
      this.AFTER_HOURS_END.hour * 60 + this.AFTER_HOURS_END.minute;

    let targetDay = et.day;
    let targetMonth = et.month;
    let targetYear = et.year;
    let dayOfWeek = et.dayOfWeek;

    // If past after-hours end, move to next day
    if (currentMinutes >= afterHoursEndMinutes) {
      const nextDate = new Date(et.year, et.month - 1, et.day + 1);
      targetYear = nextDate.getFullYear();
      targetMonth = nextDate.getMonth() + 1;
      targetDay = nextDate.getDate();
      dayOfWeek = nextDate.getDay();
    }

    // Skip weekends
    if (dayOfWeek === 6) {
      // Saturday -> Monday
      const nextDate = new Date(targetYear, targetMonth - 1, targetDay + 2);
      targetYear = nextDate.getFullYear();
      targetMonth = nextDate.getMonth() + 1;
      targetDay = nextDate.getDate();
    } else if (dayOfWeek === 0) {
      // Sunday -> Monday
      const nextDate = new Date(targetYear, targetMonth - 1, targetDay + 1);
      targetYear = nextDate.getFullYear();
      targetMonth = nextDate.getMonth() + 1;
      targetDay = nextDate.getDate();
    }

    return this.createEasternDate(
      targetYear,
      targetMonth,
      targetDay,
      this.MARKET_OPEN.hour,
      this.MARKET_OPEN.minute,
    );
  }

  /**
   * Calculate expiration time based on time-in-force
   * @param timeInForce The time in force setting
   * @returns The expiration date or null for GTC orders (no expiration)
   */
  calculateExpirationTime(timeInForce: 'day' | 'gtc'): Date | null {
    if (timeInForce === 'gtc') {
      // GTC orders don't expire (or could set to 90 days if needed)
      return null;
    }

    // DAY orders expire at next market close (handles after-hours orders)
    return this.getNextMarketClose();
  }
}
