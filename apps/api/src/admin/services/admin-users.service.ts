import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';
import { Position } from '../../portfolio/entities/position.entity';
import { OptionPosition } from '../../portfolio/entities/option-position.entity';
import { Order } from '../../orders/entities/order.entity';
import { ROLE_HIERARCHY } from '../../users/enums/user-role.enum';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditAction } from '../enums/admin-audit-action.enum';
import { QueryUsersDto } from '../dto/query-users.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AdjustBalanceDto } from '../dto/adjust-balance.dto';
import { PaginatedResponse } from '../dto/paginated-response.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Position)
    private positionRepository: Repository<Position>,
    @InjectRepository(OptionPosition)
    private optionPositionRepository: Repository<OptionPosition>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private adminAuditService: AdminAuditService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? '0.0.0.0';
  }

  async findAllUsers(query: QueryUsersDto): Promise<PaginatedResponse<User>> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (query.search) {
      queryBuilder.andWhere('user.email ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.role) {
      queryBuilder.andWhere('user.role = :role', { role: query.role });
    }

    if (query.disabled !== undefined) {
      queryBuilder.andWhere('user.disabled = :disabled', {
        disabled: query.disabled,
      });
    }

    const total = await queryBuilder.getCount();

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';
    queryBuilder
      .orderBy(`user.${sortBy}`, sortOrder)
      .skip(query.offset ?? 0)
      .take(query.limit ?? 20);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      hasMore: (query.offset ?? 0) + data.length < total,
    };
  }

  async findUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserDetails(userId: string): Promise<{
    user: User;
    positionCount: number;
    optionPositionCount: number;
    orderCount: number;
  }> {
    const user = await this.findUserById(userId);

    const [positionCount, optionPositionCount, orderCount] = await Promise.all([
      this.positionRepository.count({ where: { userId } }),
      this.optionPositionRepository.count({ where: { userId } }),
      this.orderRepository.count({ where: { userId } }),
    ]);

    return {
      user,
      positionCount,
      optionPositionCount,
      orderCount,
    };
  }

  async changeUserRole(
    admin: User,
    userId: string,
    dto: UpdateRoleDto,
    request: Request,
  ): Promise<User> {
    // Prevent self-modification
    if (admin.id === userId) {
      throw new ForbiddenException('Cannot modify your own role');
    }

    const targetUser = await this.findUserById(userId);

    // Prevent escalation above own role
    if (ROLE_HIERARCHY[dto.role] > ROLE_HIERARCHY[admin.role]) {
      throw new ForbiddenException('Cannot assign a role higher than your own');
    }

    // Prevent modification of users with equal or higher role
    if (ROLE_HIERARCHY[targetUser.role] >= ROLE_HIERARCHY[admin.role]) {
      throw new ForbiddenException(
        'Cannot modify users with equal or higher role',
      );
    }

    const previousState = { role: targetUser.role };
    targetUser.role = dto.role;

    await this.userRepository.save(targetUser);

    // Invalidate user cache
    await this.cacheManager.del(`user:${userId}`);

    // Log the action
    await this.adminAuditService.logAction({
      adminId: admin.id,
      action: AdminAuditAction.ROLE_CHANGED,
      targetUserId: userId,
      previousState,
      newState: { role: dto.role },
      reason: dto.reason,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
    });

    return targetUser;
  }

  async adjustCashBalance(
    admin: User,
    userId: string,
    dto: AdjustBalanceDto,
    request: Request,
  ): Promise<User> {
    const targetUser = await this.findUserById(userId);

    const previousBalance = Number(targetUser.cashBalance);
    const newBalance = previousBalance + dto.adjustment;

    if (newBalance < 0) {
      throw new ForbiddenException(
        'Adjustment would result in negative balance',
      );
    }

    targetUser.cashBalance = newBalance;
    await this.userRepository.save(targetUser);

    // Invalidate user cache
    await this.cacheManager.del(`user:${userId}`);

    // Log the action
    await this.adminAuditService.logAction({
      adminId: admin.id,
      action: AdminAuditAction.CASH_BALANCE_ADJUSTED,
      targetUserId: userId,
      previousState: { cashBalance: previousBalance },
      newState: { cashBalance: newBalance, adjustment: dto.adjustment },
      reason: dto.reason,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
    });

    return targetUser;
  }

  async disableUser(
    admin: User,
    userId: string,
    reason: string,
    request: Request,
  ): Promise<User> {
    // Prevent self-disabling
    if (admin.id === userId) {
      throw new ForbiddenException('Cannot disable your own account');
    }

    const targetUser = await this.findUserById(userId);

    // Prevent disabling users with equal or higher role
    if (ROLE_HIERARCHY[targetUser.role] >= ROLE_HIERARCHY[admin.role]) {
      throw new ForbiddenException(
        'Cannot disable users with equal or higher role',
      );
    }

    const previousState = { disabled: targetUser.disabled };
    targetUser.disabled = true;
    targetUser.disabledAt = new Date();

    await this.userRepository.save(targetUser);

    // Invalidate user cache
    await this.cacheManager.del(`user:${userId}`);

    // Log the action
    await this.adminAuditService.logAction({
      adminId: admin.id,
      action: AdminAuditAction.USER_DISABLED,
      targetUserId: userId,
      previousState,
      newState: { disabled: true },
      reason,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
    });

    return targetUser;
  }

  async enableUser(
    admin: User,
    userId: string,
    request: Request,
  ): Promise<User> {
    const targetUser = await this.findUserById(userId);

    const previousState = { disabled: targetUser.disabled };
    targetUser.disabled = false;
    targetUser.disabledAt = null;

    await this.userRepository.save(targetUser);

    // Invalidate user cache
    await this.cacheManager.del(`user:${userId}`);

    // Log the action
    await this.adminAuditService.logAction({
      adminId: admin.id,
      action: AdminAuditAction.USER_ENABLED,
      targetUserId: userId,
      previousState,
      newState: { disabled: false },
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
    });

    return targetUser;
  }
}
