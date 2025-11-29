import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, Between } from 'typeorm';
import { Dividend } from '../entities/dividend.entity';
import { Position } from '../entities/position.entity';
import { User } from '../../users/entities/user.entity';
import { DividendStatus } from '../enums/cost-basis.enums';

export interface DividendSummary {
  totalPending: number;
  totalPaid: number;
  annualYield: number;
  upcomingDividends: Dividend[];
  recentDividends: Dividend[];
}

@Injectable()
export class DividendService {
  private readonly logger = new Logger(DividendService.name);

  constructor(
    @InjectRepository(Dividend)
    private dividendRepository: Repository<Dividend>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Get all dividends for a user
   */
  async getDividends(
    userId: string,
    options?: {
      status?: DividendStatus;
      symbol?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<Dividend[]> {
    const queryBuilder = this.dividendRepository
      .createQueryBuilder('dividend')
      .where('dividend.userId = :userId', { userId });

    if (options?.status) {
      queryBuilder.andWhere('dividend.status = :status', {
        status: options.status,
      });
    }
    if (options?.symbol) {
      queryBuilder.andWhere('dividend.symbol = :symbol', {
        symbol: options.symbol,
      });
    }
    if (options?.startDate) {
      queryBuilder.andWhere('dividend.payDate >= :startDate', {
        startDate: options.startDate,
      });
    }
    if (options?.endDate) {
      queryBuilder.andWhere('dividend.payDate <= :endDate', {
        endDate: options.endDate,
      });
    }

    queryBuilder.orderBy('dividend.payDate', 'DESC');

    if (options?.limit) {
      queryBuilder.take(options.limit);
    }
    if (options?.offset) {
      queryBuilder.skip(options.offset);
    }

    return queryBuilder.getMany();
  }

  /**
   * Get upcoming dividends (pending status, pay date in the future)
   */
  async getUpcomingDividends(userId: string): Promise<Dividend[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.dividendRepository.find({
      where: {
        userId,
        status: DividendStatus.PENDING,
        payDate: MoreThanOrEqual(today),
      },
      order: { payDate: 'ASC' },
    });
  }

  /**
   * Get dividend summary for a user
   */
  async getDividendSummary(userId: string): Promise<DividendSummary> {
    const today = new Date();
    const yearAgo = new Date();
    yearAgo.setFullYear(today.getFullYear() - 1);

    // Get all dividends for the past year
    const dividends = await this.dividendRepository.find({
      where: {
        userId,
        payDate: MoreThanOrEqual(yearAgo),
      },
      order: { payDate: 'DESC' },
    });

    const pending = dividends.filter((d) => d.status === DividendStatus.PENDING);
    const paid = dividends.filter((d) => d.status === DividendStatus.PAID);

    const totalPending = pending.reduce(
      (sum, d) => sum + Number(d.totalAmount),
      0,
    );
    const totalPaid = paid.reduce((sum, d) => sum + Number(d.totalAmount), 0);

    // Calculate annual yield based on current portfolio value
    const positions = await this.positionRepository.find({
      where: { userId },
    });

    let portfolioValue = 0;
    for (const position of positions) {
      portfolioValue += Number(position.quantity) * Number(position.avgCostBasis);
    }

    const annualYield = portfolioValue > 0 ? (totalPaid / portfolioValue) * 100 : 0;

    // Get upcoming dividends (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const upcomingDividends = dividends
      .filter(
        (d) =>
          d.status === DividendStatus.PENDING &&
          new Date(d.payDate) >= today &&
          new Date(d.payDate) <= thirtyDaysFromNow,
      )
      .slice(0, 5);

    // Get recent dividends (last 5 paid)
    const recentDividends = paid.slice(0, 5);

    return {
      totalPending,
      totalPaid,
      annualYield,
      upcomingDividends,
      recentDividends,
    };
  }

  /**
   * Record a new dividend (typically called when ex-date passes)
   */
  async recordDividend(
    userId: string,
    symbol: string,
    exDate: Date,
    payDate: Date,
    amountPerShare: number,
    quantity: number,
  ): Promise<Dividend> {
    const totalAmount = amountPerShare * quantity;

    const dividend = this.dividendRepository.create({
      userId,
      symbol,
      exDate,
      payDate,
      amount: amountPerShare,
      quantity,
      totalAmount,
      status: DividendStatus.PENDING,
    });

    return this.dividendRepository.save(dividend);
  }

  /**
   * Process pending dividend payments (run on pay date)
   */
  async processPendingDividends(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingDividends = await this.dividendRepository.find({
      where: {
        status: DividendStatus.PENDING,
        payDate: LessThanOrEqual(today),
      },
    });

    this.logger.log(`Processing ${pendingDividends.length} pending dividends`);

    for (const dividend of pendingDividends) {
      try {
        // Credit the user's cash balance
        const user = await this.userRepository.findOne({
          where: { id: dividend.userId },
        });

        if (user) {
          await this.userRepository.update(user.id, {
            cashBalance: Number(user.cashBalance) + Number(dividend.totalAmount),
          });

          await this.dividendRepository.update(dividend.id, {
            status: DividendStatus.PAID,
          });

          this.logger.log(
            `Paid dividend ${dividend.id}: $${dividend.totalAmount} to user ${dividend.userId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to process dividend ${dividend.id}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Get annual dividend income by symbol
   */
  async getAnnualDividendsBySymbol(
    userId: string,
    year: number,
  ): Promise<{ symbol: string; totalAmount: number; paymentCount: number }[]> {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const result = await this.dividendRepository
      .createQueryBuilder('dividend')
      .select('dividend.symbol', 'symbol')
      .addSelect('SUM(dividend.totalAmount)', 'totalAmount')
      .addSelect('COUNT(*)', 'paymentCount')
      .where('dividend.userId = :userId', { userId })
      .andWhere('dividend.status = :status', { status: DividendStatus.PAID })
      .andWhere('dividend.payDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('dividend.symbol')
      .orderBy('totalAmount', 'DESC')
      .getRawMany();

    return result.map((row) => ({
      symbol: row.symbol,
      totalAmount: Number(row.totalAmount),
      paymentCount: Number(row.paymentCount),
    }));
  }
}
