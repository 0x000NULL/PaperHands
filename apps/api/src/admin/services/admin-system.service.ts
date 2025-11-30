import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { Position } from '../../portfolio/entities/position.entity';
import {
  TradierService,
  ApiUsageStats as TradierApiUsageStats,
} from '../../market-data/tradier.service';
import {
  FinnhubService,
  ApiUsageStats as FinnhubApiUsageStats,
} from '../../market-data/finnhub.service';

export interface AllApiUsageStats {
  tradier: TradierApiUsageStats;
  finnhub: FinnhubApiUsageStats;
}

export interface SystemHealth {
  database: {
    status: 'up' | 'down';
    message?: string;
  };
  redis: {
    status: 'up' | 'down';
    message?: string;
  };
  timestamp: Date;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers24h: number;
  disabledUsers: number;
  totalOrders: number;
  pendingOrders: number;
  totalPositions: number;
  adminCount: number;
  superAdminCount: number;
}

export interface JobStatus {
  name: string;
  type: 'cron' | 'interval';
  nextRun?: Date;
  isRunning: boolean;
}

@Injectable()
export class AdminSystemService {
  constructor(
    private healthCheckService: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private schedulerRegistry: SchedulerRegistry,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    private tradierService: TradierService,
    private finnhubService: FinnhubService,
  ) {}

  getAllApiUsageStats(): AllApiUsageStats {
    return {
      tradier: this.tradierService.getApiUsageStats(),
      finnhub: this.finnhubService.getApiUsageStats(),
    };
  }

  async getExtendedHealth(): Promise<SystemHealth> {
    let dbStatus: 'up' | 'down' = 'up';
    let dbMessage: string | undefined;

    try {
      await this.healthCheckService.check([
        () => this.db.pingCheck('database'),
      ]);
    } catch (error) {
      dbStatus = 'down';
      dbMessage =
        error instanceof Error ? error.message : 'Database check failed';
    }

    // Check Redis
    let redisStatus: 'up' | 'down' = 'up';
    let redisMessage: string | undefined;

    try {
      await this.cacheManager.set('health-check', 'ok', 1000);
      const value = await this.cacheManager.get('health-check');
      if (value !== 'ok') {
        throw new Error('Redis read/write check failed');
      }
    } catch (error) {
      redisStatus = 'down';
      redisMessage =
        error instanceof Error ? error.message : 'Redis check failed';
    }

    return {
      database: {
        status: dbStatus,
        message: dbMessage,
      },
      redis: {
        status: redisStatus,
        message: redisMessage,
      },
      timestamp: new Date(),
    };
  }

  async getSystemStats(): Promise<SystemStats> {
    const totalUsers = await this.userRepository.count();
    const disabledUsers = await this.userRepository.count({
      where: { disabled: true },
    });

    // Active users in last 24 hours (users who have orders in last 24h)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const activeResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COUNT(DISTINCT order.userId)', 'count')
      .where('order.createdAt >= :yesterday', { yesterday })
      .getRawOne<{ count: string }>();
    const activeUsers24h = parseInt(activeResult?.count ?? '0', 10);

    const totalOrders = await this.orderRepository.count();
    const pendingOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.status = :status', { status: 'pending' })
      .getCount();

    const totalPositions = await this.positionRepository.count();

    const adminCount = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: 'admin' })
      .getCount();
    const superAdminCount = await this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: 'super_admin' })
      .getCount();

    return {
      totalUsers,
      activeUsers24h,
      disabledUsers,
      totalOrders,
      pendingOrders,
      totalPositions,
      adminCount,
      superAdminCount,
    };
  }

  getScheduledJobs(): JobStatus[] {
    const jobs: JobStatus[] = [];

    try {
      const cronJobs = this.schedulerRegistry.getCronJobs();
      cronJobs.forEach((job, name) => {
        jobs.push({
          name,
          type: 'cron',
          nextRun: job.nextDate().toJSDate(),
          isRunning: true, // Cron jobs are active if registered
        });
      });
    } catch {
      // No cron jobs registered
    }

    try {
      const intervals = this.schedulerRegistry.getIntervals();
      intervals.forEach((name) => {
        jobs.push({
          name,
          type: 'interval',
          isRunning: true, // Intervals are always running
        });
      });
    } catch {
      // No intervals registered
    }

    return jobs;
  }
}
