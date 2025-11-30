import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminAudit } from '../entities/admin-audit.entity';
import { AdminAuditAction } from '../enums/admin-audit-action.enum';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';
import { PaginatedResponse } from '../dto/paginated-response.dto';

export interface LogActionParams {
  adminId: string;
  action: AdminAuditAction;
  targetUserId?: string | null;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  reason?: string | null;
  ipAddress: string;
  userAgent?: string | null;
}

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAudit)
    private adminAuditRepository: Repository<AdminAudit>,
  ) {}

  async logAction(params: LogActionParams): Promise<AdminAudit> {
    const audit = this.adminAuditRepository.create({
      adminId: params.adminId,
      action: params.action,
      targetUserId: params.targetUserId ?? null,
      previousState: params.previousState ?? null,
      newState: params.newState ?? null,
      reason: params.reason ?? null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent ?? null,
    });

    return this.adminAuditRepository.save(audit);
  }

  async getAuditLogs(
    query: QueryAuditLogsDto,
  ): Promise<PaginatedResponse<AdminAudit>> {
    const queryBuilder = this.adminAuditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.admin', 'admin')
      .leftJoinAndSelect('audit.targetUser', 'targetUser');

    if (query.adminId) {
      queryBuilder.andWhere('audit.adminId = :adminId', {
        adminId: query.adminId,
      });
    }

    if (query.targetUserId) {
      queryBuilder.andWhere('audit.targetUserId = :targetUserId', {
        targetUserId: query.targetUserId,
      });
    }

    if (query.action) {
      queryBuilder.andWhere('audit.action = :action', { action: query.action });
    }

    if (query.from) {
      queryBuilder.andWhere('audit.createdAt >= :from', { from: query.from });
    }

    if (query.to) {
      queryBuilder.andWhere('audit.createdAt <= :to', { to: query.to });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .orderBy('audit.createdAt', 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      hasMore: (query.offset ?? 0) + data.length < total,
    };
  }
}
