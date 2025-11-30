/**
 * Domain value object representing the IRS wash sale 30-day window.
 *
 * The wash sale rule disallows a loss deduction when you:
 * 1. Sell a security at a loss
 * 2. Purchase a substantially identical security within 30 days before or after the sale
 *
 * This class encapsulates all window-related calculations to eliminate duplicated logic.
 */
export class WashSaleWindow {
  public static readonly WINDOW_DAYS = 30;

  public readonly startDate: Date;
  public readonly endDate: Date;
  public readonly saleDate: Date;

  private constructor(saleDate: Date) {
    this.saleDate = new Date(saleDate);

    this.startDate = new Date(saleDate);
    this.startDate.setDate(
      this.startDate.getDate() - WashSaleWindow.WINDOW_DAYS,
    );

    this.endDate = new Date(saleDate);
    this.endDate.setDate(this.endDate.getDate() + WashSaleWindow.WINDOW_DAYS);
  }

  /**
   * Create a wash sale window from a sale date.
   * The window spans 30 days before and 30 days after the sale.
   */
  static fromSaleDate(saleDate: Date): WashSaleWindow {
    return new WashSaleWindow(saleDate);
  }

  /**
   * Check if a date falls within the wash sale window.
   * Same-day transactions are excluded (same day as sale doesn't count).
   */
  isWithinWindow(date: Date): boolean {
    const checkDate = new Date(date);
    return (
      checkDate >= this.startDate &&
      checkDate <= this.endDate &&
      !this.isSameDay(checkDate, this.saleDate)
    );
  }

  /**
   * Calculate the number of days between the sale and a replacement purchase.
   * Negative values indicate the replacement was before the sale.
   */
  getDaysBetween(replacementDate: Date): number {
    const replacement = new Date(replacementDate);
    const diffMs = replacement.getTime() - this.saleDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Get the window bounds for database queries.
   */
  getQueryBounds(): { windowStart: Date; windowEnd: Date; saleDate: Date } {
    return {
      windowStart: this.startDate,
      windowEnd: this.endDate,
      saleDate: this.saleDate,
    };
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }
}
